/** Preserve assigned rolls; encode the complete user UUID to avoid collisions. */
export function studentRollNumber(userId, existingRoll) {
  if (typeof existingRoll === "string" && existingRoll.trim()) return existingRoll;
  const compact = userId.replaceAll("-", "").toUpperCase();
  if (!/^[0-9A-F]{32}$/.test(compact)) throw new Error("Invalid student ID");
  const names = ["NOVA", "ORION", "VEGA", "LYRA"];
  const name = names[parseInt(compact.slice(0, 2), 16) % names.length];
  const code = BigInt("0x" + compact).toString(36).toUpperCase().padStart(25, "0");
  return `GL-${name}-${code}`;
}