/**
 * 自动化表格性能测试
 *
 * 测试项：
 *  1. 渲染性能：点击 Tab → 表格 DOM 稳定（含异步 chunk 加载）的耗时、首次出现时间、长任务阻塞
 *  2. 滚动性能：无白屏内容跟随驱动纵向滚动（仅当视口内容就绪才推进，全程不白屏）
 *     核心指标：无白屏滚动速度（px/s）；伴随指标：平均 FPS / 1% low FPS / 掉帧数 / 白屏率校验
 *
 * 流程：rspack build 生产构建 → 内置静态服务器托管 dist → Playwright(headed chromium) 逐 Tab 测量
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

const SCROLL_DURATION = 12000; // 单次滚动会话超时上限（ms），慢表格超时时以实际进度计算吞吐量
const MAX_SCROLL_PX = 6000; // 单方向滚动距离上限（px），足够反复穿越虚拟滚动窗口
const SCROLL_ROUNDS = 2; // 正式测量轮数，取各指标中位数降低抖动
const WARMUP_ROUNDS = 1; // 预热轮数（结果丢弃，消除 JIT 冷启动偏差）
const RENDER_TIMEOUT = 30000; // 渲染稳定等待超时（ms）

// 表格 label → npm 包名（用于读取实际安装版本，显示在报告标题中）
const PACKAGE_OF = {
  'stk-table-vue': 'stk-table-vue',
  'vxe-table': 'vxe-table',
  'naive-ui': 'naive-ui',
  'element-plus': 'element-plus',
  'arco-design': '@arco-design/web-vue',
  tdesign: 'tdesign-vue-next',
  'ant-design-vue(surely-vue)': '@surely-vue/table',
  'v-table': '@visactor/vtable',
  'ag-grid': 'ag-grid-vue3',
  'tanstack-table': '@tanstack/vue-table',
};

// 读取组件库实际安装版本（读不到时返回空串）
async function versionOf(label) {
  const pkg = PACKAGE_OF[label];
  if (!pkg) return '';
  try {
    const pkgJson = JSON.parse(await readFile(path.join(ROOT, 'node_modules', pkg, 'package.json'), 'utf-8'));
    return pkgJson.version || '';
  } catch {
    return '';
  }
}

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
  // 端口被上次残留进程占用时自动顺延
  const port = await new Promise((resolve, reject) => {
    const tryListen = p => {
      server.once('error', err => {
        if (err.code === 'EADDRINUSE' && p < PORT + 10) tryListen(p + 1);
        else reject(err);
      });
      server.listen(p, '127.0.0.1', () => resolve(p));
    };
    tryListen(PORT);
  });
  console.log(`[2/4] 静态服务器已启动: http://127.0.0.1:${port}/`);
  return { server, port };
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

// 滚动会话：无白屏内容跟随驱动——仅当视口内容渲染就绪才推进下一步，全程不出现白屏
// 核心指标 = 无白屏滚动速度（px/s）：表格保持内容可见的前提下能滚多快，慢表格自动得低分
// FPS/1%low 为各自极限速度下的伴随指标；canvas 类表格（如 VTable）没有可滚动 DOM，退化为 wheel 事件驱动
const runScrollSession = args => {
  const { timeoutMs, maxScrollPx } = args;
  // 帧采集：外部通过 stop() 结束（page.evaluate 序列化函数须自包含，故定义在内部）
  const startCollect = () => {
    const frames = [];
    let last;
    let stopped = false;
    const loop = t => {
      if (stopped) return;
      if (last != null) frames.push(t - last);
      last = t;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return { frames, stop: () => (stopped = true) };
  };

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

  const el = findScrollContainer();
  const panel = getPanelRoot();

  // 视口内是否已有真实行内容（白屏检测：可见行覆盖 ≥60% 且视口内行有真实文本）
  // 虚拟表格复用行时元素先占位、内容后填充，仅查覆盖会误判
  // 文本校验在 panel 范围扫描：vxe/element 的固定列渲染在滚动容器外的独立层，只查容器内会永远误判为白屏
  const ROW_SEL =
    'tr, [class*="row"], [class*="Row"], [class*="item"], [class*="Item"], [class*="cell-group"]';
  const contentReady = () => {
    const er = el.getBoundingClientRect();
    let cover = 0;
    for (const r of el.querySelectorAll(ROW_SEL)) {
      const b = r.getBoundingClientRect();
      if (b.height < 5 || b.width < 50) continue;
      const top = Math.max(b.top, er.top);
      const bot = Math.min(b.bottom, er.bottom);
      if (bot - top <= 0) continue;
      cover += bot - top;
      if (cover >= er.height * 0.6) break;
    }
    if (cover < er.height * 0.6) return false;
    for (const r of panel.querySelectorAll(ROW_SEL)) {
      const b = r.getBoundingClientRect();
      if (b.bottom < er.top || b.top > er.bottom) continue;
      if (b.right < er.left || b.left > er.right) continue;
      if (r.textContent.trim()) return true;
    }
    return false;
  };

  const driveScroll = ({ timeoutMs: timeout }) =>
    new Promise(resolve => {
      if (!el) return resolve({ method: 'none', moved: 0, pxPerSec: 0, blankPct: 0 });
      const max = Math.min(el.scrollHeight - el.clientHeight, maxScrollPx);
      if (max <= 0) return resolve({ method: 'no-scroll', moved: 0, pxPerSec: 0, blankPct: 0 });
      el.scrollTop = 0;
      const viewH = el.clientHeight || 600;
      // 按整页（视口高度）滚动：贴近手动翻页节奏，对渲染能力是更强的压力测试
      const stepPx = Math.round(viewH);
      const deadline = performance.now() + timeout;
      const t0 = performance.now();
      let dist = 0;
      let timedOut = false;
      // 白屏采样：理论上内容跟随永不为空，非零值说明提交瞬间缓冲不足或检测抖动
      let blankFrames = 0;
      let totalFrames = 0;
      let readyHits = 0;
      let blank = false;
      let stuckFrames = 0;
      const sample = () => {
        if (dist >= max) return;
        totalFrames++;
        if (contentReady()) {
          if (++readyHits >= 2) blank = false;
        } else {
          readyHits = 0;
          blank = true;
        }
        if (blank && totalFrames > 5) blankFrames++;
        requestAnimationFrame(sample);
      };
      const finish = () => {
        const dt = (performance.now() - t0) / 1000;
        return resolve({
          method: 'scroll',
          moved: Math.round(dist),
          timeout: timedOut,
          pxPerSec: dt > 0.2 ? Math.round(dist / dt) : 0,
          blankPct: totalFrames ? +((blankFrames / totalFrames) * 100).toFixed(1) : 0,
        });
      };
      const commit = () => {
        dist = Math.min(dist + stepPx, max);
        el.scrollTop = dist;
        // 容器拒绝滚动（scrollTop 始终上不去）时判为无效，避免空转满超时
        if (el.scrollTop < 5 && dist < max && ++stuckFrames > 30) {
          return resolve({ method: 'no-scroll', moved: 0, pxPerSec: 0, blankPct: 0 });
        }
        requestAnimationFrame(step);
      };
      const step = () => {
        if (dist >= max) return finish();
        if (performance.now() > deadline) {
          timedOut = true;
          return finish();
        }
        // 内容就绪门控：连续 2 帧确认可见内容完整才提交下一步，保证全程无白屏
        const w0 = performance.now();
        let hits = 0;
        const poll = () => {
          if (performance.now() > deadline) {
            timedOut = true;
            return finish();
          }
          if (contentReady()) {
            if (++hits >= 2) return commit();
          } else {
            hits = 0;
            // 兜底：长时间不就绪（如检测误判）仍放行，避免卡死；此路径会产生白屏帧并被采样计入
            if (performance.now() - w0 > 300) return commit();
          }
          requestAnimationFrame(poll);
        };
        poll();
      };
      requestAnimationFrame(sample);
      requestAnimationFrame(step);
    });

  const driveWheel = () =>
    new Promise(resolve => {
      // canvas 表格无可滚动 DOM：高频 wheel 模拟手动快速翻页（每帧一次、每次一整页），
      // canvas 重绘是同步的，不存在白屏，无需节流，压力贴近手动拖动的真实体感
      const target = panel.querySelector('canvas') || panel;
      const r = target.getBoundingClientRect();
      const stepY = Math.max(400, r.height);
      const duration = timeoutMs;
      const start = performance.now();
      let down = true;
      const fire = dir => {
        target.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: stepY * dir,
            clientX: r.left + r.width / 2,
            clientY: r.top + r.height / 2,
            bubbles: true,
            cancelable: true,
          }),
        );
      };
      const tick = () => {
        const now = performance.now();
        if (now - start > duration) return resolve({ method: 'wheel', moved: -1 });
        if (now - start > duration / 2) down = false;
        fire(down ? 1 : -1);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

  const collector = startCollect();
  return (el ? driveScroll(args) : driveWheel()).then(drive => {
    collector.stop();
    return { frames: collector.frames, ...drive };
  });
};

// ---------------- 统计 ----------------
const median = arr => {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

function frameStats(frames) {
  // 丢弃开头 5 帧：rAF 启动瞬间及驱动函数刚执行的抖动；会话过短无有效样本时返回 null
  frames = frames.slice(5);
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
  const { server, port } = await startStaticServer();

  console.log('[3/4] 启动 chromium（headed 模式，接近真实浏览器体感）执行测试...');
  const browser = await chromium.launch({
    headless: false,
    args: ['--enable-precise-memory-info'],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('pageerror', e => console.warn('  [pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
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
    const version = await versionOf(label);
    process.stdout.write(`  测试 ${label.padEnd(16)}`);

    await page.evaluate(() => (window.__longTasks.length = 0));
    const heap0 = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);

    // --- 渲染测试 ---
    const t0 = Date.now();
    await buttons[i].click();
    const render = await page.evaluate(waitRenderStable, RENDER_TIMEOUT);
    const renderMs = Date.now() - t0;
    const ltRender = await page.evaluate(() => window.__longTasks.slice());

    // --- 滚动测试：预热 + 多轮采样，各指标取中位数降低抖动 ---
    await new Promise(r => setTimeout(r, 150)); // 渲染后静置，避免影响滚动采集
    let method = 'none';
    let moved = 0;
    const roundStats = [];
    const roundBlanks = [];
    const roundPxs = [];
    const ltScrollAll = [];
    for (let round = 0; round < WARMUP_ROUNDS + SCROLL_ROUNDS; round++) {
      await page.evaluate(() => (window.__longTasks.length = 0));
      const s = await page.evaluate(runScrollSession, {
        timeoutMs: SCROLL_DURATION,
        maxScrollPx: MAX_SCROLL_PX,
      });
      method = s.method;
      moved = Math.max(moved, s.moved);
      if (typeof s.blankPct === 'number') roundBlanks.push(s.blankPct);
      if (typeof s.pxPerSec === 'number') roundPxs.push(s.pxPerSec);
      const lt = await page.evaluate(() => window.__longTasks.slice());
      if (round >= WARMUP_ROUNDS) {
        roundStats.push(frameStats(s.frames));
        ltScrollAll.push(...lt);
      }
    }
    const valid = roundStats.filter(Boolean);
    const stats = valid.length
      ? {
          avgFps: +median(valid.map(s => s.avgFps)).toFixed(1),
          lowFps1pct: +median(valid.map(s => s.lowFps1pct)).toFixed(1),
          p99FrameMs: +median(valid.map(s => s.p99FrameMs)).toFixed(1),
          worstFrameMs: +median(valid.map(s => s.worstFrameMs)).toFixed(1),
          dropped: Math.round(median(valid.map(s => s.dropped))),
        }
      : null;
    const ltScroll = ltScrollAll;
    if (method === 'scroll' && moved === 0) {
      console.warn(`  ⚠ ${label}: 滚动容器未实际滚动，FPS 数据无效`);
    }

    const heap1 = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);

    const sum = arr => Math.round(arr.reduce((a, b) => a + b, 0));
    results.push({
      table: label,
      version,
      renderMs,
      firstPaintMs: Math.round(render.firstPaint),
      domNodes: render.nodes,
      renderLongTaskMs: sum(ltRender),
      scrollMethod: method,
      scrolledPx: moved,
      pxPerSec: roundPxs.length ? Math.round(median(roundPxs)) : '-',
      blankPct: roundBlanks.length ? +median(roundBlanks).toFixed(1) : '-',
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
      ` 渲染 ${r.renderMs}ms | 无白屏速度 ${r.pxPerSec}px/s | 平均 ${r.avgFps}fps | 1%low ${r.lowFps1pct}fps | 白屏 ${r.blankPct}%`,
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
      '无白屏速度(px/s)': r.pxPerSec,
      '白屏率(%)': r.blankPct,
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
      JSON.stringify({
        time: new Date().toLocaleString(),
        scrollDuration: SCROLL_DURATION,
      }),
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
