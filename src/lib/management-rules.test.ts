import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dashboardGroups, financialSummary, paymentAmount, absentStudents, liveClassOnDay, messageLink, enrollmentState, isFreeCourse } from './management-rules';
import { panelPathAllowed, getPanelRole } from './panel-permissions';
describe('requested dashboard and admin rules', () => {
  it('pending enrollments stay pending without granting access', () => {
    assert.equal(enrollmentState([{course_id:'paid',status:'pending',payment_status:'pending'}]),'pending');
    const groups = dashboardGroups([{id:'paid',price:7000},{id:'free',price:0}], [{course_id:'paid',payment_status:'pending'}]);
    assert.deepEqual(groups.pending.map(c=>c.id), ['paid']); assert.deepEqual(groups.other,[]);
  });
  it('all published free courses appear without enrollment', () => {
    assert.deepEqual(dashboardGroups([{id:'a',price:0},{id:'b',price:0,is_published:false},{id:'c',price:5000}],[]).free.map(c=>c.id),['a']);
    assert.equal(isFreeCourse({price:null}),false); assert.equal(isFreeCourse({price:0}),true);
  });
  it('finance uses saved paid amount not the changed course price', () => {
    assert.equal(paymentAmount({id:'1',course_id:'a',amount_paid:5000,courses:{id:'a',price:7000}}),5000);
    assert.equal(paymentAmount({id:'2',course_id:'a',amount_paid:0,courses:{id:'a',price:7000}}),0);
  });
  it('finance excludes pending/refunded rows and computes real monthly earnings', () => {
    const stats = financialSummary([
      {id:'1',course_id:'a',payment_status:'verified',amount_paid:5000,enrolled_at:'2026-10-28T08:00:00Z'},
      {id:'2',course_id:'a',payment_status:'verified',amount_paid:2000,enrolled_at:'2026-09-15T08:00:00Z'},
      {id:'3',course_id:'a',payment_status:'pending',amount_paid:7000},
      {id:'4',course_id:'a',status:'refunded',payment_status:'verified',amount_paid:7000},
    ], new Date('2026-10-28T08:00:00Z'));
    assert.equal(stats.totalRevenue,7000); assert.equal(stats.monthlyRevenue,5000); assert.equal(stats.previousRevenue,2000); assert.equal(stats.count,2);
  });
  it('absence is specific to the class and date, not another class or yesterday', () => {
    assert.deepEqual(absentStudents([{profile_id:'a'},{profile_id:'b'}],[{profile_id:'a',lesson_id:'l',attended_on:'2026-10-28'},{profile_id:'b',lesson_id:'l',attended_on:'2026-10-27'}],'l','2026-10-28').map(s=>s.profile_id),['b']);
    assert.equal(liveClassOnDay({live_url:'https://example.com',live_expires_at:'2026-10-28T18:00:00Z'},'2026-10-28'),true);
    assert.equal(liveClassOnDay({live_url:'https://example.com',live_expires_at:'2026-10-26T18:00:00Z'},'2026-10-28'),false);
  });
  it('manual WhatsApp queue encodes messages and normalizes 01 numbers', () => {
    assert.equal(messageLink('01712345678','Hello {name}',{name:'Raihan'}),'https://wa.me/8801712345678?text=Hello%20Raihan');
    assert.equal(messageLink('123','Hi',{}),'');
  });
  it('moderators cannot open Dashboard Teachers Reviews Ads or manage roles', () => {
    for (const path of ['/admin','/admin/teachers','/admin/reviews','/admin/moderators','/admin/settings']) assert.equal(panelPathAllowed('moderator',path),false,path);
    for (const path of ['/admin/courses','/admin/attendance','/admin/messages','/admin/earnings','/admin/course-verification']) assert.equal(panelPathAllowed('moderator',path),true,path);
    assert.equal(panelPathAllowed(null,'/admin/courses'),false);
  });
  it('panel roles require a verified Auth identity and a protected role read', async () => {
    const query = {eq: async () => ({data:[{role:'moderator'}],error:null})};
    const client = {auth:{getUser:async () => ({data:{user:{id:'m'}},error:null})},from:() => ({select:()=>query})};
    assert.equal(await getPanelRole(client),'moderator');
    assert.equal(await getPanelRole({...client,auth:{getUser:async () => ({data:{user:null},error:null})}}),null);
  });
});