import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {moderatorLoginEmail} from './moderator-login';
import {teacherLoginEmail,teacherPasswordSchema} from './teacher-login';
import {panelPathAllowed} from './panel-permissions';
describe('Moderator name/password accounts',()=>{
  it('resolves the same moderator name without requiring email',async()=>{assert.equal(await moderatorLoginEmail(' Raihan   Tech '),await moderatorLoginEmail('raihan tech'));assert.notEqual(await moderatorLoginEmail('raihan tech'),await teacherLoginEmail('raihan tech'));});
  it('preserves the assigned password exactly',()=>{assert.equal(teacherPasswordSchema.parse(' Secret 123 '),' Secret 123 ');});
  it('denies moderator management even with moderator access',()=>{assert.equal(panelPathAllowed('moderator','/admin/moderators'),false);assert.equal(panelPathAllowed('moderator','/admin/courses'),true);});
});