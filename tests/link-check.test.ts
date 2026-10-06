import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPublicIP, classify, collectLinks } from '../scripts/check-links.mjs';
test('link checker rejects private, mapped and non-global IPs', () => {
 for (const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','172.16.0.1','192.168.1.1','::1','::ffff:8.8.8.8','fc00::1','fe80::1','2001:db8::1']) assert.equal(isPublicIP(ip), false, ip);
 for (const ip of ['8.8.8.8','2606:4700::1111']) assert.equal(isPublicIP(ip), true, ip);
});
test('HTTP findings do not equate denied requests with broken links', () => {
 assert.equal(classify(403), 'manual-review'); assert.equal(classify(404), 'suspected-unavailable'); assert.equal(classify(410), 'suspected-unavailable'); assert.equal(classify(200), 'reachable');
});
test('link extraction includes commands and guide text but deduplicates', () => {
 assert.deepEqual(collectLinks({cmd:'curl https://example.com/a | sh',guide:['https://example.com/a','https://example.org/']}), ['https://example.com/a','https://example.org/']);
});
