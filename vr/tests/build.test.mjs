import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { integrate } from '../build.mjs';
const ui = await readFile(new URL('../src/interface.js', import.meta.url), 'utf8');
const fixture = `// ==UserScript==
// @name BiliAnalysis
// @namespace original
// @version 0.3.4
// @downloadURL https://example.test/original
// @updateURL https://example.test/original
// ==/UserScript==
(function () {
function handleParseAndCopy(url, mode) { return url + mode; }
function getActiveParseModesForTarget(target) { return []; }
function getButtonPositionSettings() { return {}; }
function init() {}
    init();
})();
`;
test('保留上游解析方法，只在初始化後接上 UI', () => {
 const output=integrate(fixture,ui);
 assert.ok(output.includes('function handleParseAndCopy(url, mode) { return url + mode; }'));
 assert.ok(output.includes("getModes: () => getActiveParseModesForTarget('video')"));
 assert.ok(output.includes('// @name         BiliAnalysis VR'));
 assert.ok(output.includes('// @updateURL    https://raw.githubusercontent.com/TW527E/BiliAnalysis/main/vr/BiliAnalysis-VR.user.js'));
 assert.ok(!output.includes('// @updateURL https://example.test/original'));
});
test('上游重構接點或結尾時拒絕產生整合版', () => {
 assert.throws(()=>integrate(fixture.replace('handleParseAndCopy','renamed'),ui),/接點改變/);
 assert.throws(()=>integrate(fixture.replace('    init();','    start();'),ui),/結構改變/);
 assert.throws(()=>integrate(fixture,'invalid javascript!'),/Unexpected/);
});
