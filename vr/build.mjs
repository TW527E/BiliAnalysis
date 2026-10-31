import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const root = dirname(fileURLToPath(import.meta.url));
const footer = /\n    init\(\);\s*\n\}\)\(\);\s*$/;
const downloadUrl = 'https://raw.githubusercontent.com/TW527E/BiliAnalysis/main/vr/BiliAnalysis-VR.user.js';
export function integrate(source, ui) {
    for (const name of ['handleParseAndCopy', 'getActiveParseModesForTarget', 'getButtonPositionSettings']) {
        if (!new RegExp(`function ${name}\\(`).test(source)) throw new Error(`上游接點改變：${name}。保留舊版，請先調整接點。`);
    }
    if (!footer.test(source) || !source.startsWith('// ==UserScript==')) throw new Error('上游結構改變，無法安全整合。');
    const upstreamVersion = source.match(/^\/\/ @version\s+(\S+)/m)?.[1];
    if (!upstreamVersion) throw new Error('缺少上游版本。');
    let output = source
        .replace(/^\/\/ @name\s+.*$/m, '// @name         BiliAnalysis VR')
        .replace(/^\/\/ @namespace\s+.*$/m, '// @namespace    bilianalysis-vr-local')
        .replace(/^\/\/ @version\s+.*$/m, `// @version      ${upstreamVersion}.4`)
        .replace(/^\/\/ @description\s+.*$/m, '// @description  BiliAnalysis 原版解析，搭配大按鈕與 BewlyCat 卡片快捷鍵。')
        .replace(/^\/\/ @(downloadURL|updateURL)\s+.*$/gm, `// @$1    ${downloadUrl}`);
    output = output.replace(footer, `\n    init();\n    (${ui.trim()})({\n        parse: handleParseAndCopy,\n        getModes: () => getActiveParseModesForTarget('video'),\n        getPosition: getButtonPositionSettings\n    });\n})();\n`);
    new Script(output, { filename: 'BiliAnalysis-VR.user.js' });
    return output;
}

async function build() {
    const ui = await readFile(join(root, 'src/interface.js'), 'utf8');
    let source;
    let revision = 'local';
    if (process.argv[2]) {
        source = await readFile(process.argv[2], 'utf8');
    } else {
        const { stdout } = await promisify(execFile)('git', ['ls-remote', 'https://github.com/mmyo456/BiliAnalysis.git', 'refs/heads/main'], { timeout:20000 });
        revision = stdout.split(/\s/)[0];
        if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('無效的上游 revision');
        const script = await fetch(`https://raw.githubusercontent.com/mmyo456/BiliAnalysis/${revision}/BiliAnalysis-main.user.js`, { signal:AbortSignal.timeout(20000) });
        if (!script.ok) throw new Error(`腳本下載失敗：${script.status}`);
        source = await script.text();
    }
    const output = integrate(source, ui);
    const target = join(root, 'BiliAnalysis-VR.user.js');
    await writeFile(`${target}.tmp`, output);
    await rename(`${target}.tmp`, target);
    await writeFile(join(root, 'upstream.json'), JSON.stringify({
        repository:'https://github.com/mmyo456/BiliAnalysis', revision,
        version:source.match(/^\/\/ @version\s+(\S+)/m)[1],
        sha256:createHash('sha256').update(source).digest('hex'),
        builtAt:new Date().toISOString()
    }, null, 2) + '\n');
    console.log(`已產生 ${target}（上游 ${revision}）。解析方法原樣保留；請執行測試後再安裝。`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    build().catch(error => { console.error(error.message); process.exitCode = 1; });
}
