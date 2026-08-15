import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../.perf-tools/node_modules/playwright/index.mjs';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const srv = http
  .createServer((req, res) => {
    let f = path.join(DIST, decodeURIComponent(new URL(req.url, 'http://x/').pathname));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
    res.end(fs.readFileSync(f));
  })
  .listen(8092, '127.0.0.1', async () => {
    console.error('[step] server listening');
    const b = await chromium.launch();
    const p = await b.newPage();
    console.error('[step] browser launched');
    await p.goto('http://127.0.0.1:8092/');
    await p.waitForSelector('.tab-btn');
    console.error('[step] page loaded');
    await p.click('.tab-btn'); // StkTable tab
    await p.waitForTimeout(1500);
    console.error('[step] tab clicked');
    const info = await p.evaluate(() => {
      const out = [];
      const stkMain = document.querySelector('.stk-table-main');
      const stkRoot = document.querySelector('.stk-table');
      out.push({
        sel: '.stk-table-main',
        found: !!stkMain,
        cls: stkMain && String(stkMain.className).slice(0, 80),
        sh: stkMain && stkMain.scrollHeight,
        ch: stkMain && stkMain.clientHeight,
      });
      out.push({
        sel: '.stk-table',
        found: !!stkRoot,
        cls: stkRoot && String(stkRoot.className).slice(0, 80),
        sh: stkRoot && stkRoot.scrollHeight,
        ch: stkRoot && stkRoot.clientHeight,
      });
      return out;
    });
    fs.writeFileSync('perf/dom-dump.json', JSON.stringify(info, null, 1));
    console.error('[done] written perf/dom-dump.json, entries:', info.length);
    await b.close();
    srv.close();
  });
