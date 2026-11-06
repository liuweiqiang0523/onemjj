import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { refreshPublicContent } from '../src/content-refresh';
import { validData } from '../src/data-schema';
const read = (name: string) => JSON.parse(readFileSync(new URL('../src/' + name, import.meta.url), 'utf8'));
const defaults = read('default-data.json');
const issue003 = read('weekly-003.json');
const issue004 = read('weekly-004.json');
test('003 promotes exactly once with verbatim archive and unchanged catalogue', () => {
 const input = { ...structuredClone(defaults), weekly: issue003, weeklyArchives: defaults.weeklyArchives.filter((w: any) => w.issue !== '003') };
 const result = refreshPublicContent(input);
 assert.deepEqual(result.weekly, issue004);
 assert.deepEqual(result.weeklyArchives.find((w: any) => w.issue === '003'), issue003);
 for (const key of Object.keys(input).filter(k => !['weekly','weeklyArchives'].includes(k))) assert.deepEqual(result[key], input[key]);
 assert.deepEqual(refreshPublicContent(result), result);
 assert.deepEqual(input.weekly, issue003);
 assert.ok(validData(result));
});
test('custom 003 sections, unknown fields and all 004 edits win', () => {
 for (const change of [(w: any) => { w.sections[0].body += '勘误'; }, (w: any) => { w.custom = '保留'; }, (w: any) => { w.date = '2026-11-01'; }]) {
  const input = { ...structuredClone(defaults), weekly: structuredClone(issue003) }; change(input.weekly);
  assert.deepEqual(refreshPublicContent(input), input);
 }
 const edited = structuredClone(defaults); edited.weekly.headlineBody = '后台004编辑';
 assert.deepEqual(refreshPublicContent(edited), edited);
 const archived = { ...structuredClone(defaults), weekly: structuredClone(issue003) }; archived.weeklyArchives.find((w: any) => w.issue === '003').headlineTitle = '历史勘误';
 assert.equal(refreshPublicContent(archived).weeklyArchives.find((w: any) => w.issue === '003').headlineTitle, '历史勘误');
});
test('weekly links reject executable URLs and protocol-relative navigation', () => {
 for (const url of ['javascript:alert(1)','//evil.example/']) {
  const input = structuredClone(defaults); input.weekly.links = [{label:'bad',url}]; assert.equal(validData(input),false);
 }
});
