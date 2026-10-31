import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const profile = await mkdtemp(join(tmpdir(), 'bilianalysis-vr-test-'));
const server = createServer(async (req, res) => {
 try {
  const file = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  const body = await readFile(file);
  res.setHeader('Content-Type', extname(file) === '.html' ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8');
  res.end(body);
 } catch { res.writeHead(404); res.end(); }
});
try {
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const url = `http://127.0.0.1:${server.address().port}/tests/browser.html?test=1&late=1`;
 const { stdout } = await promisify(execFile)(process.env.BROWSER || 'google-chrome-stable', [
  '--disable-vivaldi', '--headless=new', '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${profile}`, '--window-size=1440,900', '--dump-dom', '--virtual-time-budget=12000', url
 ], { timeout:30000, maxBuffer:1024*1024 });
 assert.match(stdout, /data-test-result="PASS"/, stdout.match(/<pre id="result">([\s\S]*?)<\/pre>/)?.[1] || '瀏覽器驗證未完成');
 console.log(stdout.match(/<pre id="result">([^\n<]+)/)?.[1] || '瀏覽器驗證通過');
} finally {
 server.close();
 await rm(profile, { recursive:true, force:true, maxRetries:5, retryDelay:100 });
}
