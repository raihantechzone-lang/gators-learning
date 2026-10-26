import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { studentRollNumber } from "./student-roll.js";

describe("Automatic student roll numbers", () => {
  const id = "550e8400-e29b-41d4-a716-446655440000";
  it("generates distinctive alphanumeric rolls, not sequential 1 or 2", () => {
    assert.equal(studentRollNumber(id), "GL-ORION-51A37IAKUF5NUUPHR0FX89OG0");
    assert.match(studentRollNumber(id), /^GL-(NOVA|ORION|VEGA|LYRA)-[A-Z0-9]{25}$/);
  });
  it("keeps an existing student's assigned roll unchanged", () => {
    assert.equal(studentRollNumber(id, "GL-EXISTING-27"), "GL-EXISTING-27");
  });
  it("keeps the generated roll stable across signup and login", () => {
    assert.equal(studentRollNumber(id), studentRollNumber(id));
    assert.equal(studentRollNumber(id.toUpperCase()), studentRollNumber(id));
  });
  it("distinguishes IDs that differ only at the end", () => {
    assert.notEqual(studentRollNumber(id), studentRollNumber("550e8400-e29b-41d4-a716-446655440001"));
  });
});