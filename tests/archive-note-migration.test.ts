import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { refreshPublicContent } from '../src/content-refresh';
test('KV archived historical observations receive the same exact safety correction as current notes', () => {
 const d = JSON.parse(readFileSync(new URL('../src/default-data.json', import.meta.url), 'utf8'));
 const old = '本月真实观察：WorkBuddy 的 hy3（腾讯混元）白嫖额度续到 8 月底，实测可用。';
 d.weeklyArchives[0].notes[0].body = old + '\n后台新增说明';
 const result = refreshPublicContent(d);
 assert.ok(result.weeklyArchives[0].notes[0].body.includes('该日期现已过期'));
 assert.ok(result.weeklyArchives[0].notes[0].body.endsWith('后台新增说明'));
 assert.deepEqual(refreshPublicContent(result), result);
});
