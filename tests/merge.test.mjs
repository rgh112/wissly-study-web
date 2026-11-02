import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../public/session-merge.js';
const base=()=>({version:'study-4',order:'A',index:1,furthest:1,surveyPage:0,skipped:false,answers:{v4_start:2,v4_status:3}});
test('independent tabs merge answers while preserving navigation and remote answers',()=>{
 const b=base(),l=structuredClone(b),r=structuredClone(b);l.answers.v4_start=5;l.index=2;l.furthest=2;r.answers.v4_status=4;r.furthest=6;
 const merged=mergeStudySession(b,l,r);assert.equal(merged.answers.v4_start,5);assert.equal(merged.answers.v4_status,4);assert.equal(merged.index,2);assert.equal(merged.furthest,6);
 r.index=6;l.index=b.index;assert.equal(mergeStudySession(b,l,r).index,b.index);
});
test('same answer conflicts and different questionnaire versions never merge',()=>{
 const b=base(),l=structuredClone(b),r=structuredClone(b);l.answers.v4_start=5;r.answers.v4_start=4;assert.equal(mergeStudySession(b,l,r),null);
 r.answers.v4_start=5;assert.equal(mergeStudySession(b,l,r).answers.v4_start,5);r.version='study-3';assert.equal(mergeStudySession(b,l,r),null);
});
