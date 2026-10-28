export function normalizeAdminNumber(value: string): string {
  return value.replace(/[০-৯]/g, digit => String('০১২৩৪৫৬৭৮৯'.indexOf(digit))).trim();
}

export function parseAdminNumber(value: string, label: string, integer = false): number {
  const normalized = normalizeAdminNumber(value);
  const number = Number(normalized);
  if (!normalized || !Number.isFinite(number) || number < 0 || (integer && !Number.isInteger(number))) {
    throw new Error(`${label}: একটি সঠিক ${integer ? 'পূর্ণ' : ''} সংখ্যা দিন।`);
  }
  return number;
}

export function certificateLink(value: string): string {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('একটি সঠিক PDF লিংক দিন।');
  return url.href;
}