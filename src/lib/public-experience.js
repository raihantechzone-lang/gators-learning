/** Keep email input consistent across HTML and React account forms. Never alter passwords. */
export function normalizeStudentEmail(value) {
  return String(value ?? "").trim().toLowerCase();
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