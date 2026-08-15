/**
 * 自动化表格性能测试
 *
 * 测试项：
 *  1. 渲染性能：点击 Tab → 表格 DOM 稳定（含异步 chunk 加载）的耗时、首次出现时间、长任务阻塞
 *  2. 滚动性能：程序化驱动纵向滚动（先下到底再回顶部），用 rAF 采集帧间隔
 *     指标：平均 FPS / 1% low FPS / 最差帧耗时(p99) / 掉帧数(>33.4ms)
 *
 * 流程：rspack build 生产构建 → 内置静态服务器托管 dist → Playwright(headless chromium) 逐 Tab 测量
 *      → 生成 perf-results.json + perf-report.html(echarts 可视化) → 启动报告服务并自动打开浏览器
 *
 * 用法：npm run perf
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../.perf-tools/node_modules/playwright/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PORT = 8091;
const REPORT_PORT = 8093; // 报告服务端口
const BASE_URL = `http://127.0.0.1:${PORT}/`;

const SCROLL_DURATION = 4000; // 单次滚动会话时长（ms），前半程向下、后半程向上
const RENDER_TIMEOUT = 30000; // 渲染稳定等待超时（ms）

// ---------------- 构建 ----------------
function build() {
  console.log('[1/4] rspack 生产构建中...');
  const r = spawnSync('npx', ['rspack', 'build'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) throw new Error('rspack build 失败');
}

// ---------------- 静态服务器 ----------------
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function startStaticServer() {
  const server = createServer(async (req, res) => {
    try {
      let filePath = path.join(DIST, decodeURIComponent(new URL(req.url, BASE_URL).pathname));
      try {
        await readFile(filePath);
      } catch {
        filePath = path.join(DIST, 'index.html');
      }
      const data = await readFile(filePath);
      res.setHeader('Content-Type', MIME[path.extname(filePath)] || 'application/octet-stream');
      res.end(data);
    } catch (e) {
      res.statusCode = 500;
      res.end(String(e));
    }
  });
  await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));
  console.log(`[2/4] 静态服务器已启动: ${BASE_URL}`);
  return server;
}

// ---------------- 页面内辅助函数 ----------------
// 注意：page.evaluate 序列化的函数在页面作用域独立执行，所有逻辑必须自包含
// 检测范围：多根组件的 .tab-panel class 只挂在第一个根节点上（如 VTable 落在 <h2> 上），
// 故页面内统一取 .tab-panel 的父级作为检测范围

// 渲染稳定性检测：DOM 节点数连续 4 次采样（每次 50ms）无增长视为渲染完成
const waitRenderStable = async timeoutMs => {
  const start = performance.now();
  let prev = -1;
  let stableCount = 0;
  let firstPaint = 0;
  while (performance.now() - start < timeoutMs) {
    const panel = document.querySelector('.tab-panel')?.parentElement || document.body;
    const n = panel.querySelectorAll('*').length;
    if (n > 0 && firstPaint === 0) firstPaint = performance.now() - start;
    if (n > 0 && n === prev) {
      stableCount++;
      if (stableCount >= 4) {
        return { ms: performance.now() - start, firstPaint, nodes: n, timeout: false };
      }
    } else {
      stableCount = 0;
    }
    prev = n;
    await new Promise(r => setTimeout(r, 50));
  }
  return { ms: performance.now() - start, firstPaint, nodes: prev, timeout: true };
};

// 滚动会话：rAF 驱动 scrollTop（三角波：先到底再回顶）+ 同时采集帧间隔
// canvas 类表格（如 VTable）没有可滚动 DOM，退化为合成 wheel 事件驱动
const runScrollSession = durationMs => {
  const getPanelRoot = () =>
    document.querySelector('.tab-panel')?.parentElement || document.body;
  // 通用滚动容器查找：overflow 可滚动且 scrollHeight 超出可视高度的最大元素
  const findScrollContainer = () => {
    const panel = getPanelRoot();
    if (!panel) return null;
    // 特例 1：element TableV2 窗口化滚动，主体滚动器是 .el-table-v2__main 内无类名 div（overflow:hidden + 大 scrollHeight）
    const elvl = panel.querySelector('.el-table-v2__main .el-vl__wrapper > div');
    if (elvl && elvl.scrollHeight > elvl.clientHeight) return elvl;
    // 特例 2：stk-table 根容器 overflow:hidden + 内部 spacer，transform 平移视口，直接操作根元素 scrollTop
    const stkBody = panel.querySelector('.stk-table');
    if (stkBody && stkBody.scrollHeight > stkBody.clientHeight) return stkBody;
    const cands = [];
    for (const el of panel.querySelectorAll('*')) {
      const s = getComputedStyle(el);
      if (!/(auto|scroll|overlay)/.test(s.overflowY)) continue;
      if (el.scrollHeight - el.clientHeight < 50) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 100 || r.height < 100) continue;
      cands.push(el);
    }
    if (!cands.length) return null;
    cands.sort((a, b) => b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight));
    return cands[0];
  };

  const panel = getPanelRoot();
  const el = findScrollContainer();

  const collect = () =>
    new Promise(resolve => {
      const frames = [];
      let last;
      const start = performance.now();
      const loop = t => {
        if (last != null) frames.push(t - last);
        last = t;
        if (t - start < durationMs) requestAnimationFrame(loop);
        else resolve(frames);
      };
      requestAnimationFrame(loop);
    });

  const driveScroll = () =>
    new Promise(resolve => {
      if (!el) return resolve({ method: 'none', moved: 0 });
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) return resolve({ method: 'no-scroll', moved: 0 });
      el.scrollTop = 0;
      const start = performance.now();
      let peak = 0;
      const step = now => {
        const p = Math.min(1, (now - start) / durationMs);
        const q = p < 0.5 ? p * 2 : (1 - p) * 2; // 三角波
        el.scrollTop = max * q;
        peak = Math.max(peak, el.scrollTop);
        if (p < 1) requestAnimationFrame(step);
        else resolve({ method: 'scroll', moved: Math.round(peak) });
      };
      requestAnimationFrame(step);
    });

  const driveWheel = () =>
    new Promise(resolve => {
      // canvas 类表格（如 VTable）没有可滚动 DOM，用 wheel 事件驱动
      const target = panel.querySelector('canvas') || panel;
      const start = performance.now();
      const step = now => {
        const p = (now - start) / durationMs;
        if (p >= 1) return resolve('wheel');
        const dir = p < 0.5 ? 1 : -1;
        const r = target.getBoundingClientRect();
        target.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: 120 * dir,
            clientX: r.left + r.width / 2,
            clientY: r.top + r.height / 2,
            bubbles: true,
            cancelable: true,
          }),
        );
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }).then(() => ({ method: 'wheel', moved: -1 }));

  return Promise.all([collect(), el ? driveScroll() : driveWheel()]).then(([frames, drive]) => ({
    frames,
    ...drive,
  }));
};

// ---------------- 统计 ----------------
function frameStats(frames) {
  if (!frames.length) return null;
  const total = frames.reduce((a, b) => a + b, 0);
  const avgFps = (frames.length / total) * 1000;
  const sorted = [...frames].sort((a, b) => b - a);
  const p99 = sorted[Math.max(0, Math.floor(frames.length * 0.01) - 1)] ?? sorted[0];
  const worst = sorted[0];
  // 1% low FPS：取最差 1% 帧的平均帧耗时换算 FPS
  const worstN = Math.max(1, Math.floor(frames.length * 0.01));
  const worstAvg = sorted.slice(0, worstN).reduce((a, b) => a + b, 0) / worstN;
  const lowFps = 1000 / worstAvg;
  const dropped = frames.filter(f => f > 33.4).length;
  return {
    frames: frames.length,
    avgFps: +avgFps.toFixed(1),
    lowFps1pct: +lowFps.toFixed(1),
    p99FrameMs: +p99.toFixed(1),
    worstFrameMs: +worst.toFixed(1),
    dropped,
    scrollDuration: +total.toFixed(0),
  };
}

// ---------------- 主流程 ----------------
async function main() {
  build();
  const server = await startStaticServer();

  console.log('[3/4] 启动 headless chromium 执行测试...');
  const browser = await chromium.launch({
    args: ['--enable-precise-memory-info'],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('pageerror', e => console.warn('  [pageerror]', e.message));
  await page.goto(BASE_URL, { waitUntil: 'load' });
  await page.waitForSelector('.tab-btn');

  // 安装 longtask 观察器
  await page.evaluate(() => {
    window.__longTasks = [];
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) window.__longTasks.push(e.duration);
    }).observe({ entryTypes: ['longtask'] });
  });

  const buttons = await page.locator('.tab-btn').all();
  const labels = [];
  for (const b of buttons) labels.push(await b.textContent());

  // 预检测：跳过没有真实表格组件的 tab（如 vuetify 占位页）
  const skip = new Set();
  for (let i = 0; i < buttons.length; i++) {
    await buttons[i].click();
    await page.waitForTimeout(300);
    const hasTable = await page.evaluate(() => {
      const root = document.querySelector('.tab-panel')?.parentElement || document.body;
      if (root.querySelector('canvas')) return true;
      // 特例：element TableV2 / stk-table 的滚动容器是 overflow:hidden，无法用通用规则检测
      if (root.querySelector('.el-table-v2__main .el-vl__wrapper > div')) return true;
      if (root.querySelector('.stk-table')) return true;
      const cands = [...root.querySelectorAll('*')].filter(el => {
        const s = getComputedStyle(el);
        return (
          /(auto|scroll|overlay)/.test(s.overflowY) && el.scrollHeight - el.clientHeight > 50
        );
      });
      return cands.length > 0;
    });
    if (!hasTable) {
      skip.add(i);
      console.log(`  跳过 ${labels[i].trim()}（无可测试的表格组件）`);
    }
  }

  const results = [];
  for (let i = 0; i < buttons.length; i++) {
    if (skip.has(i)) continue;
    const label = labels[i].trim();
    process.stdout.write(`  测试 ${label.padEnd(16)}`);

    await page.evaluate(() => (window.__longTasks.length = 0));
    const heap0 = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);

    // --- 渲染测试 ---
    const t0 = Date.now();
    await buttons[i].click();
    const render = await page.evaluate(waitRenderStable, RENDER_TIMEOUT);
    const renderMs = Date.now() - t0;
    const ltRender = await page.evaluate(() => window.__longTasks.slice());

    // --- 滚动测试 ---
    await page.evaluate(() => (window.__longTasks.length = 0));
    await new Promise(r => setTimeout(r, 300)); // 渲染后静置，避免影响滚动采样
    const { frames, method, moved } = await page.evaluate(runScrollSession, SCROLL_DURATION);
    const stats = frameStats(frames);
    const ltScroll = await page.evaluate(() => window.__longTasks.slice());
    if (method === 'scroll' && moved === 0) {
      console.warn(`  ⚠ ${label}: 滚动容器未实际滚动，FPS 数据无效`);
    }

    const heap1 = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);

    const sum = arr => Math.round(arr.reduce((a, b) => a + b, 0));
    results.push({
      table: label,
      renderMs,
      firstPaintMs: Math.round(render.firstPaint),
      domNodes: render.nodes,
      renderLongTaskMs: sum(ltRender),
      scrollMethod: method,
      scrolledPx: moved,
      avgFps: stats?.avgFps ?? '-',
      lowFps1pct: stats?.lowFps1pct ?? '-',
      p99FrameMs: stats?.p99FrameMs ?? '-',
      worstFrameMs: stats?.worstFrameMs ?? '-',
      droppedFrames: stats?.dropped ?? '-',
      scrollLongTaskMs: sum(ltScroll),
      heapDeltaMB: +((heap1 - heap0) / 1048576).toFixed(1),
      timeout: render.timeout,
    });
    const r = results[results.length - 1];
    console.log(
      ` 渲染 ${r.renderMs}ms | 平均 ${r.avgFps}fps | 1%low ${r.lowFps1pct}fps | 掉帧 ${r.droppedFrames}`,
    );
  }

  await browser.close();
  server.close();

  // ---------------- 输出报告 ----------------
  console.log('\n[4/4] 测试结果汇总：\n');
  console.table(
    results.map(r => ({
      表格: r.table,
      '渲染耗时(ms)': r.renderMs,
      '首次出现(ms)': r.firstPaintMs,
      '渲染长任务(ms)': r.renderLongTaskMs,
      滚动方式: r.scrollMethod,
      '实际滚动(px)': r.scrolledPx,
      '平均FPS': r.avgFps,
      '1%low FPS': r.lowFps1pct,
      'p99帧(ms)': r.p99FrameMs,
      '最差帧(ms)': r.worstFrameMs,
      掉帧数: r.droppedFrames,
      '滚动长任务(ms)': r.scrollLongTaskMs,
      '堆增量(MB)': r.heapDeltaMB,
    })),
  );

  const jsonPath = path.join(__dirname, 'perf-results.json');
  const reportPath = path.join(__dirname, 'perf-report.html');
  const { writeFile } = await import('node:fs/promises');
  await writeFile(jsonPath, JSON.stringify(results, null, 2), 'utf-8');

  // 由模板生成 HTML 报告（内联数据，单文件即可打开）
  // 注意：替换内容用函数形式避免 $&/$$ 特殊模式；replaceAll 保证注释中的占位符也一并替换
  const template = await readFile(path.join(__dirname, 'report-template.html'), 'utf-8');
  const html = template
    .replaceAll('__DATA__', () => JSON.stringify(results))
    .replaceAll('__META__', () =>
      JSON.stringify({ time: new Date().toLocaleString(), scrollDuration: SCROLL_DURATION }),
    );
  await writeFile(reportPath, html, 'utf-8');
  console.log(`原始数据: ${jsonPath}`);
  console.log(`HTML 报告: ${reportPath}`);

  // ---------------- 启动报告服务并打开浏览器 ----------------
  const reportServer = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://x/').pathname);
      let filePath = path.join(__dirname, pathname);
      try {
        await readFile(filePath);
      } catch {
        filePath = reportPath;
      }
      const data = await readFile(filePath);
      res.setHeader('Content-Type', MIME[path.extname(filePath)] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      res.end(data);
    } catch (e) {
      res.statusCode = 500;
      res.end(String(e));
    }
  });
  // 端口被占用（如上次的报告服务还在跑）时自动顺延
  let reportPort = REPORT_PORT;
  await new Promise((resolve, reject) => {
    const tryListen = port => {
      reportServer.once('error', err => {
        if (err.code === 'EADDRINUSE' && port < REPORT_PORT + 10) tryListen(port + 1);
        else reject(err);
      });
      reportServer.listen(port, '127.0.0.1', () => {
        reportPort = port;
        resolve();
      });
    };
    tryListen(REPORT_PORT);
  });
  const reportUrl = `http://127.0.0.1:${reportPort}/perf-report.html`;
  console.log(`\n报告服务已启动: ${reportUrl}（Ctrl+C 退出）`);

  // 用系统默认浏览器打开报告
  const opener =
    process.platform === 'win32'
      ? spawn('cmd', ['/c', 'start', '', reportUrl], { stdio: 'ignore' })
      : process.platform === 'darwin'
        ? spawn('open', [reportUrl], { stdio: 'ignore' })
        : spawn('xdg-open', [reportUrl], { stdio: 'ignore' });
  opener.on('error', () => console.log('自动打开浏览器失败，请手动访问上方地址'));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
