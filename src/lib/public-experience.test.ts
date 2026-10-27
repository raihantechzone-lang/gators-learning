import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeStudentEmail, adDisplayImage, whatsappPhone, courseFaqs } from "./public-experience.js";

describe('WhatsApp country code', () => {
  it('adds Bangladesh country code to 01 numbers', () => assert.equal(whatsappPhone('01789-407200'), '8801789407200'));
  it('accepts +880 1 numbers', () => assert.equal(whatsappPhone('+880 1789 407200'), '8801789407200'));
  it('accepts Bengali digits', () => assert.equal(whatsappPhone('০১৭৮৯৪০৭২০০'), '8801789407200'));
  it('rejects incomplete numbers', () => assert.equal(whatsappPhone('01789'), ''));
});
describe('Course FAQ data', () => {
  it('pairs numbered questions with following answers', () => assert.deepEqual(courseFaqs('১. কার জন্য?\nশিক্ষার্থীদের জন্য।\n২. অনলাইন?\nহ্যাঁ।'), [{ question: '১. কার জন্য?', answer: 'শিক্ষার্থীদের জন্য।' }, { question: '২. অনলাইন?', answer: 'হ্যাঁ।' }]));
  it('preserves answers with additional separators', () => assert.deepEqual(courseFaqs('কী পাব? | ভিডিও | নোট'), [{ question: 'কী পাব?', answer: 'ভিডিও | নোট' }]));
});

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