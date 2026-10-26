import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeStudentEmail, adDisplayImage } from "./public-experience.js";

describe("Repeat student login", () => {
  it("uses the same email for signup and login despite casing or surrounding spaces", () => {
    assert.equal(normalizeStudentEmail("  Student@Gmail.com "), "student@gmail.com");
    assert.equal(normalizeStudentEmail("student@gmail.com"), "student@gmail.com");
  });
});

describe("Ad images", () => {
  it("requests a display-sized ImageKit photo without changing its path", () => {
    const url = new URL(adDisplayImage("https://ik.imagekit.io/demo/ads/photo.jpg"));
    assert.equal(url.pathname, "/demo/ads/photo.jpg");
    assert.equal(url.searchParams.get("tr"), "w-840,q-80,f-auto");
  });
  it("does not modify another provider's image URL", () => {
    assert.equal(adDisplayImage("https://images.example.com/photo.jpg"), "https://images.example.com/photo.jpg");
  });
});