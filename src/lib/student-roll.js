/** Preserve assigned rolls; derive a stable 9-digit numeric roll (fits an integer column) from the full user UUID. */
export function studentRollNumber(userId, existingRoll) {
  if (typeof existingRoll === "number" && existingRoll > 0) return existingRoll;
  if (typeof existingRoll === "string" && /^\d+$/.test(existingRoll.trim())) return Number(existingRoll.trim());
  const compact = userId.replaceAll("-", "").toUpperCase();
  if (!/^[0-9A-F]{32}$/.test(compact)) throw new Error("Invalid student ID");
  let h = 2166136261;
  for (const ch of compact) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return 100000000 + (h % 900000000);
}
