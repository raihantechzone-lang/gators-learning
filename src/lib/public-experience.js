/** Keep email input consistent across HTML and React account forms. Never alter passwords. */
export function normalizeStudentEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

/** Teacher aliases match the administrator-issued account identity. */
export async function accountLoginEmail(value) {
  const input = String(value ?? '').trim();
  if (input.includes('@')) return normalizeStudentEmail(input);
  const normalized = input.normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
  if (normalized.length < 2 || normalized.length > 80) throw new Error('Enter your email or teacher name.');
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return `${Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('')}@teachers.gators.invalid`;
}

export async function accountDashboard(client, user) {
  if (!String(user?.email || '').endsWith('@teachers.gators.invalid')) return '/dashboard';
  const { data, error } = await client.from('teachers').select('id').eq('user_id', user.id).maybeSingle();
  if (error || !data) throw new Error('This account is not assigned as a teacher. Contact your administrator.');
  return '/teacher';
}

export function coursePrices(course) {
  const original = Math.max(0, Number(course.price) || 0);
  const discount = Number(course.discount_price);
  const discounted = discount > 0 && discount < original;
  return { original, payable: discounted ? discount : original, discounted };
}

export function isHomepageReview(review) {
  return review.course_id == null && !String(review.comment || '').startsWith('[lesson:');
}

export function paymentConfirmationMessage(name, title) {
  return `*Hello ${name},*\n\nCongratulations! 🎉 Your payment for *${title}* has been successfully verified.\n\nYour course enrollment is now confirmed, and you can access your course from your student dashboard.\n\nThank you for choosing us. We wish you a successful learning journey!\n\n*Gators Learning*`;
}

/** Accept local and international Bangladeshi mobile numbers for WhatsApp. */
export function whatsappPhone(value) {
  let digits = String(value ?? "").replace(/[০-৯]/g, c => String('০১২৩৪৫৬৭৮৯'.indexOf(c))).replace(/\D/g, '');
  if (digits.startsWith('00880')) digits = digits.slice(2);
  if (/^1\d{9}$/.test(digits)) digits = '0' + digits;
  if (/^8801\d{9}$/.test(digits)) return digits;
  if (/^88?01\d{9}$/.test(digits)) digits = digits.replace(/^88?/, '');
  if (/^01\d{9}$/.test(digits)) digits = '88' + digits;
  if (/^8801\d{9}$/.test(digits)) return digits;
  return '';
}

/** Support both question | answer lines and numbered questions followed by paragraphs. */
export function courseFaqs(value) {
  const lines = String(value ?? '').split('\n').map(s => s.trim()).filter(Boolean);
  const result = [];
  for (const line of lines) {
    const separator = line.indexOf('|');
    if (separator >= 0) {
      result.push({ question: line.slice(0, separator).trim(), answer: line.slice(separator + 1).trim() });
    } else if (!result.length || /[?？]$/.test(line) || /^[0-9০-৯]+[.)।]/.test(line)) {
      result.push({ question: line, answer: '' });
    } else {
      const last = result[result.length - 1];
      last.answer += (last.answer ? '\n' : '') + line;
    }
  }
  return result;
}

/** Recorded lessons never expose their old live session; live links expire after one day. */
export function isLessonLive(lesson, now = Date.now()) {
  return Boolean(lesson?.live_url && !String(lesson.youtube_url || lesson.video_file_url || "").trim()
    && lesson.live_expires_at && Date.parse(lesson.live_expires_at) > now);
}

/** Resize only ImageKit assets; leave other storage providers' URLs intact. */
export function adDisplayImage(value) {
  try {
    const url = new URL(value);
    if (url.hostname === "ik.imagekit.io") {
      url.searchParams.set("tr", "w-840,q-80,f-auto");
      return url.href;
    }
  } catch { /* Return the original URL so normal image error handling applies. */ }
  return value;
}