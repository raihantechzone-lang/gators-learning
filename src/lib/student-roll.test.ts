import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { studentRollNumber } from "./student-roll.js";

describe("Automatic student roll numbers", () => {
  const id = "550e8400-e29b-41d4-a716-446655440000";
  it("generates a 9-digit number that fits an integer column", () => {
    const r = studentRollNumber(id);
    assert.ok(Number.isInteger(r) && r >= 100000000 && r <= 999999999);
  });
  it("keeps an existing numeric roll unchanged", () => {
    assert.equal(studentRollNumber(id, 27), 27);
    assert.equal(studentRollNumber(id, "4521"), 4521);
  });
  it("replaces an old text roll the database cannot store", () => {
    assert.equal(studentRollNumber(id, "GL-NOVA-ABC"), studentRollNumber(id));
  });
  it("is stable across signup and login", () => {
    assert.equal(studentRollNumber(id.toUpperCase()), studentRollNumber(id));
  });
  it("distinguishes IDs that differ only at the end", () => {
    assert.notEqual(studentRollNumber(id), studentRollNumber("550e8400-e29b-41d4-a716-446655440001"));
  });
});
