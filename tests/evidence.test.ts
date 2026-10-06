import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesSearch, renderVerification, renderFeedback, renderPostEvidence, renderToc } from '../src/content-evidence';
test('local search supports Chinese aliases and article tags',()=>{
 assert.ok(matchesSearch({id:'network',name:'三网'},'回程'));
 assert.ok(matchesSearch({id:'media',name:'媒体'},'115'));
 assert.ok(matchesSearch({id:'ai-api',name:'AI'},'模型中转'));
 assert.ok(matchesSearch({title:'示例',tags:['自托管']},'自托管'));
});
test('verification and feedback escape titles and distinguish read checks',()=>{
 const html=renderVerification({id:'ai-api',links:[]});
 assert.match(html,/未执行/); assert.match(html,/费用/); assert.match(html,/适用环境/); assert.match(html,/unknown/);
 const feedback=renderFeedback('工具 <x>','https://onemjj.com/tools/ai-api/');
 assert.match(feedback,/mailto:liuweiqiang0523@gmail.com/);assert.match(feedback,/data-copy/); assert.doesNotMatch(feedback,/<x>/);
});
test('publication evidence is explicit and TOC anchor labels are escaped',()=>{
 assert.match(renderPostEvidence({slug:'other',date:'2026-07-24'}),/首次发布.*2026-07-24/);
 assert.match(renderPostEvidence({slug:'other',date:'2026-07-24'}),/unknown/);
 assert.doesNotMatch(renderToc([{id:'a',text:'<img>',level:2},{id:'b',text:'b',level:2},{id:'c',text:'c',level:2}]),/<img>/);
});
