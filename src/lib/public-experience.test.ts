import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeStudentEmail, adDisplayImage, whatsappPhone, courseFaqs, coursePrices, isHomepageReview, accountLoginEmail, accountDashboard, isLessonLive, signInAccount, courseNeedsPayment } from "./public-experience.js";

describe('Requested course and account rules', () => {
  it('free enrollment skips payment while unknown and paid prices do not',()=>{assert.equal(courseNeedsPayment({price:0}),false);assert.equal(courseNeedsPayment({price:5000}),true);assert.equal(courseNeedsPayment({price:null}),true);});
  it('moderator names sign in without changing assigned passwords',async()=>{
    const calls: {email:string;password:string}[]=[];
    const client={auth:{signInWithPassword:async(input:{email:string;password:string})=>{calls.push(input);return {error:input.email.endsWith('@moderators.gators.invalid')?null:{message:'invalid'},data:{}};}}};
    await signInAccount(client,'Raihan',' Secret 123 ');
    assert.equal(calls.length,2);assert.match(calls[1].email,/@moderators\.gators\.invalid$/);assert.equal(calls[1].password,' Secret 123 ');
  });
  it('moderator login requires the protected role before opening courses',async()=>{
    const client={auth:{getUser:async()=>({data:{user:{id:'m'}},error:null})},from:()=>({select:()=>({eq:async()=>({data:[{role:'moderator'}],error:null})})})};
    assert.equal(await accountDashboard(client,{id:'m',email:'hash@moderators.gators.invalid'}),'/admin/courses');
    await assert.rejects(accountDashboard({...client,auth:{getUser:async()=>({data:{user:{id:'other'}},error:null})}},{id:'m',email:'hash@moderators.gators.invalid'}));
  });
  it('permits attendance only during the live window, never for recorded or expired classes', () => {
    const now = Date.parse('2026-10-27T17:45:00Z');
    const lesson = { live_url: 'https://meet.example.com/class', live_expires_at: '2026-10-27T18:00:00Z' };
    assert.equal(isLessonLive(lesson, now), true);
    assert.equal(isLessonLive(lesson, Date.parse('2026-10-27T18:00:00Z')), false);
    assert.equal(isLessonLive({ ...lesson, youtube_url: 'https://youtube.com/watch?v=123' }, now), false);
    assert.equal(isLessonLive({ ...lesson, video_file_url: 'https://example.com/recording.mp4' }, now), false);
    assert.equal(isLessonLive({ ...lesson, live_url: null }, now), false);
  });
  it('uses 5000 as payable and 7000 as the original', () => assert.deepEqual(coursePrices({ price: 7000, discount_price: 5000 }), { original: 7000, payable: 5000, discounted: true }));
  it('does not discount when the discount price is empty or zero', () => assert.equal(coursePrices({ price: 7000, discount_price: 0 }).payable, 7000));
  it('keeps only homepage reviews, excluding lesson comments', () => {
    assert.equal(isHomepageReview({ course_id: null, comment: 'Great' }), true);
    assert.equal(isHomepageReview({ course_id: 'course', comment: '[lesson:123] Hi' }), false);
    assert.equal(isHomepageReview({ course_id: null, comment: '[lesson:123] Hi' }), false);
  });
  it('resolves teacher names consistently without modifying student email rules', async () => {
    assert.equal(await accountLoginEmail(' Sabbir   Ahmed '), await accountLoginEmail('sabbir ahmed'));
    assert.match(await accountLoginEmail('Sabbir Ahmed'), /^[a-f0-9]{64}@teachers\.gators\.invalid$/);
    assert.equal(await accountLoginEmail(' Student@Email.com '), 'student@email.com');
  });
  it('opens only a verified teacher dashboard, otherwise the student dashboard', async () => {
    const client = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'teacher' }, error: null }) }) }) }) };
    assert.equal(await accountDashboard(client, { id: 't', email: 'hash@teachers.gators.invalid' }), '/teacher');
    assert.equal(await accountDashboard(client, { id: 's', email: 'student@mail.com' }), '/dashboard');
  });
});

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