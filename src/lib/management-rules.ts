import { enrollmentHasAccess, coursePrices, whatsappPhone } from './public-experience.js';

type CourseLite = { id: string; title?: string; price?: unknown; discount_price?: unknown; is_published?: boolean };
type EnrollmentLite = { course_id: string; status?: string; payment_status?: string | null };
export function isFreeCourse(course: { price?: unknown } | null | undefined) {
  return course?.price != null && Number(course.price) === 0;
}
export function enrollmentState(rows: EnrollmentLite[]) {
  if (rows.some(enrollmentHasAccess)) return 'verified' as const;
  if (rows.some(r => !['refunded','cancelled','canceled','revoked','expired'].includes(String(r.status || '').toLowerCase()) && (r.payment_status === 'pending' || r.status === 'pending'))) return 'pending' as const;
  return 'unverified' as const;
}
export function dashboardGroups<T extends CourseLite, E extends EnrollmentLite>(courses: T[], enrollments: E[]) {
  const free = courses.filter(c => c.is_published !== false && isFreeCourse(c));
  const pending = courses.filter(c => !isFreeCourse(c) && enrollmentState(enrollments.filter(e => e.course_id === c.id)) === 'pending');
  const other = courses.filter(c => !isFreeCourse(c) && !pending.some(p => p.id === c.id) && !enrollments.some(e => e.course_id === c.id && enrollmentHasAccess(e)));
  return { free, pending, other };
}
export type PaymentRow = EnrollmentLite & { id: string; amount_paid?: unknown; enrolled_at?: string | null; created_at?: string | null; courses?: CourseLite | CourseLite[] | null };
export function paymentAmount(row: PaymentRow) {
  if (row.amount_paid != null && String(row.amount_paid).trim() !== '') {
    const amount = Number(row.amount_paid);
    return Number.isFinite(amount) && amount >= 0 ? amount : 0;
  }
  const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
  return course ? coursePrices(course).payable : 0;
}
const dhakaMonth = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit' }).format(date);
export function financialSummary(rows: PaymentRow[], now = new Date()) {
  const valid = rows.filter(enrollmentHasAccess).sort((a,b) => (b.enrolled_at || b.created_at || '').localeCompare(a.enrolled_at || a.created_at || ''));
  const month = dhakaMonth(now);
  const previous = dhakaMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15)));
  let totalRevenue = 0, monthlyRevenue = 0, previousRevenue = 0;
  const grouped = new Map<string, { id: string; title: string; count: number; revenue: number }>();
  for (const row of valid) {
    const amount = paymentAmount(row);
    totalRevenue += amount;
    const date = new Date(row.enrolled_at || row.created_at || '');
    if (Number.isFinite(date.getTime())) {
      if (dhakaMonth(date) === month) monthlyRevenue += amount;
      if (dhakaMonth(date) === previous) previousRevenue += amount;
    }
    const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
    const item = grouped.get(row.course_id) || { id: row.course_id, title: course?.title || 'অপসারিত কোর্স', count: 0, revenue: 0 };
    item.count++; item.revenue += amount; grouped.set(row.course_id, item);
  }
  return { totalRevenue, monthlyRevenue, previousRevenue, count: valid.length, courseStats: [...grouped.values()].sort((a,b) => b.revenue - a.revenue), transactions: valid.slice(0,20) };
}
export type MessageStudent = { profile_id: string; profiles?: { full_name?: string | null; phone?: string | null; whatsapp?: string | null; roll_number?: string | number | null } | null };
export function absentStudents(students: MessageStudent[], rows: { profile_id: string; lesson_id: string; attended_on: string }[], lessonId: string, day: string) {
  const present = new Set(rows.filter(r => r.lesson_id === lessonId && r.attended_on === day).map(r => r.profile_id));
  return students.filter(s => !present.has(s.profile_id));
}
export function liveClassOnDay(lesson: { live_url?: string | null; live_expires_at?: string | null }, day: string) {
  if (!lesson.live_url || !lesson.live_expires_at) return false;
  const end = Date.parse(lesson.live_expires_at);
  if (!Number.isFinite(end)) return false;
  // Existing live links last 24 hours; use that window, never the lesson's creation date.
  const startOfDay = Date.parse(`${day}T00:00:00+06:00`);
  return Number.isFinite(startOfDay) && end > startOfDay && end - 86400000 < startOfDay + 86400000;
}
export const bangladeshDay = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
export const attendanceMessage = 'প্রিয় {name},\n\n{date} তারিখে আপনার {course} কোর্সের “{lesson}” লাইভ ক্লাসে আপনার হাজিরা পাওয়া যায়নি। ক্লাসে অংশ নিয়ে থাকলে আমাদের জানান; না করে থাকলে রেকর্ডিং দেখে নিন এবং পরের ক্লাসে উপস্থিত থাকুন।\n\n*Gators Learning*';
export function messageLink(phone: unknown, template: string, values: Record<string,string>) {
  const number = whatsappPhone(phone);
  if (!number) return '';
  const message = template.replace(/\{(name|course|lesson|date)\}/g, (_, key: string) => values[key] || '');
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}