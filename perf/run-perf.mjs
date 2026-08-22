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

const SCROLL_DURATION = 5000; // 单次滚动会话超时上限（ms），慢表格超时时以实际进度计算吞吐量
const MAX_SCROLL_PX = 50000; // 单方向滚动距离上限（px），canvas-vue-table 10000 行数据约 390000px
const SCROLL_ROUNDS = 2; // 正式测量轮数，取各指标中位数降低抖动
const WARMUP_ROUNDS = 1; // 预热轮数（结果丢弃，消除 JIT 冷启动偏差）
const RENDER_TIMEOUT = 10000; // 渲染稳定等待超时（ms）

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
  vuetify: 'vuetify',
  primevue: 'primevue',
  'tanstack-virtual': '@tanstack/vue-virtual',
  revogrid: '@revolist/revogrid',
  'canvas-vue-table': 'canvas-vue-table',
  'simple-table': '@simple-table/vue',
};

// 各表格官网链接
const URL_MAP = {
  'stk-table-vue': 'https://ja-plus.github.io/stk-table-vue/',
  'vxe-table': 'https://vxetable.cn/',
  'naive-ui': 'https://www.naiveui.com/',
  'element-plus': 'https://element-plus.org/',
  'arco-design': 'https://arco.design/vue/',
  tdesign: 'https://tdesign.tencent.com/vue-next/',
  'ant-design-vue(surely-vue)': 'https://www.surelyvue.com/',
  'v-table': 'https://visactor.io/vtable/',
  'ag-grid': 'https://www.ag-grid.com/',
  vuetify: 'https://vuetifyjs.com/',
  primevue: 'https://primevue.org/',
  'tanstack-virtual': 'https://tanstack.com/virtual/',
  revogrid: 'https://revolist.github.io/revogrid/',
  'canvas-vue-table': 'https://yongjianyu.github.io/canvas-vue-table/',
  'simple-table': 'https://www.simple-table.com/docs/installation',
};

// 功能丰富度特性配置（取值 1=支持，0.5=部分支持，0=不支持）：
//   fixed     = 左右固定列
//   rowHeight = 行高控制（原生支持；需 CSS 压缩实现计 0.5）
//   hVirtual  = 横向虚拟列表（列级虚拟化，只渲染可见列；整行渲染仅容器横向滚动计 0；
//               库原生支持但当前版本缺陷未启用计 0.5，如 naive-ui 2.44.1 virtual-scroll-x 固定列错位）
//   width     = 宽度控制（容器宽度自适应铺满；需外部 ResizeObserver 等 JS 动态控制计 0.5）
//   filtering = 列筛选（内置列头筛选器，无需手动实现）
//   sorting   = 列排序（内置列头排序，支持多列排序计 0.5→1）
//   editing   = 单元格编辑（内置行内编辑能力）
//   export    = 导出（内置导出 CSV/Excel 能力）
//   treeExpand = 树形/展开行（树形数据或行展开详细视图；仅展开行无树形计 0.5）
//   cellMerge = 合并单元格（内置单元格合并 API，rowspan/colspan）
//   headerGroup = 表头分组（多级列头分组）
//   rangeSelection = 区域选择（鼠标拖拽或 Shift+click 选择多单元格区域）
// 依据：各组件官方文档及实际 API 支持度
const USABILITY = {
  'stk-table-vue': { fixed: 1, rowHeight: 1, hVirtual: 1, width: 1, filtering: 1, sorting: 1, editing: 1, export: 1, treeExpand: 1, cellMerge: 1, headerGroup: 1, rangeSelection: 1, noBlank: 1 },
  'vxe-table': { fixed: 1, rowHeight: 1, hVirtual: 1, width: 1, filtering: 1, sorting: 1, editing: 1, export: 1, treeExpand: 1, cellMerge: 1, headerGroup: 1, rangeSelection: 1, noBlank: 1 },
  'naive-ui': { fixed: 1, rowHeight: 0.5, hVirtual: 0.5, width: 1, filtering: 1, sorting: 1, editing: 0.5, export: 0, treeExpand: 0.5, cellMerge: 0, headerGroup: 1, rangeSelection: 0, noBlank: 1 },
  'element-plus': { fixed: 1, rowHeight: 1, hVirtual: 0, width: 0.5, filtering: 1, sorting: 1, editing: 0.5, export: 0, treeExpand: 0.5, cellMerge: 0.5, headerGroup: 1, rangeSelection: 0, noBlank: 1 },
  'arco-design': { fixed: 0, rowHeight: 0, hVirtual: 0, width: 1, filtering: 1, sorting: 1, editing: 0, export: 0, treeExpand: 0.5, cellMerge: 0, headerGroup: 1, rangeSelection: 0, noBlank: 0 },
  tdesign: { fixed: 0.5, rowHeight: 0.5, hVirtual: 0, width: 1, filtering: 1, sorting: 1, editing: 1, export: 0, treeExpand: 0.5, cellMerge: 0.5, headerGroup: 1, rangeSelection: 0.5, noBlank: 0 },
  'ant-design-vue(surely-vue)': {
    fixed: 1,
    rowHeight: 0.5,
    hVirtual: 0.5,
    width: 1,
    filtering: 1,
    sorting: 1,
    editing: 0,
    export: 0,
    treeExpand: 0.5,
    cellMerge: 0,
    headerGroup: 1,
    rangeSelection: 0,
    noBlank: 1,
  },
  vuetify: { fixed: 0, rowHeight: 1, hVirtual: 0, width: 1, filtering: 1, sorting: 1, editing: 0.5, export: 0, treeExpand: 0.5, cellMerge: 0, headerGroup: 0, rangeSelection: 0, noBlank: 0 },
  primevue: { fixed: 1, rowHeight: 0.5, hVirtual: 0, width: 1, filtering: 1, sorting: 1, editing: 1, export: 1, treeExpand: 0.5, cellMerge: 0.5, headerGroup: 0.5, rangeSelection: 0.5, noBlank: 0 },
  'v-table': { fixed: 1, rowHeight: 1, hVirtual: 1, width: 1, filtering: 1, sorting: 1, editing: 1, export: 1, treeExpand: 1, cellMerge: 1, headerGroup: 1, rangeSelection: 1, noBlank: 1 },
  'ag-grid': { fixed: 1, rowHeight: 1, hVirtual: 1, width: 1, filtering: 1, sorting: 1, editing: 1, export: 1, treeExpand: 1, cellMerge: 1, headerGroup: 1, rangeSelection: 1, noBlank: 1 },
  'tanstack-virtual': { fixed: 0, rowHeight: 1, hVirtual: 0, width: 1, filtering: 0, sorting: 0, editing: 0, export: 0, treeExpand: 0, cellMerge: 0, headerGroup: 0, rangeSelection: 0, noBlank: 0 },
  revogrid: { fixed: 1, rowHeight: 1, hVirtual: 1, width: 1, filtering: 0, sorting: 0, editing: 1, export: 0, treeExpand: 0, cellMerge: 0.5, headerGroup: 0, rangeSelection: 0.5, noBlank: 1 },
  'canvas-vue-table': { fixed: 1, rowHeight: 0, hVirtual: 0, width: 1, filtering: 0, sorting: 0, editing: 0, export: 0, treeExpand: 0, cellMerge: 0, headerGroup: 0, rangeSelection: 0, noBlank: 1 },
  'simple-table': { fixed: 1, rowHeight: 1, hVirtual: 1, width: 1, filtering: 1, sorting: 1, editing: 1, export: 1, treeExpand: 1, cellMerge: 1, headerGroup: 1, rangeSelection: 0, noBlank: 0 },
  // 注：vue-virtual-scroller / virtua / vueuc(VirtualList) 为通用虚拟列表，不属于表格组件，
  // 已从应用移除、不参与测试与排名（代码保留于 src/vue/ 下）
};

// 易用性主观评分（5 分制，0.5 分档）：作者在接入本项目（10000 行 × 40 列、左右固定列、横纵虚拟滚动）
// 过程中的主观体验评价，评估维度：配置复杂度 / 文档质量 / 类型提示与 API 设计 / 开箱即用程度
// 渲染方式分类：
//   Vue DOM = Vue 组件，DOM 渲染单元格
//   Canvas = Canvas 直接绘制（无 DOM 单元格）
//   Web Component = 基于 Web Component 原生标准
//   JS DOM = 纯 JavaScript 虚拟滚动封装，表格 UI 需自行实现
const RENDER_TYPE = {
  'stk-table-vue': 'Vue DOM',
  'vxe-table': 'Vue DOM',
  'naive-ui': 'Vue DOM',
  'element-plus': 'Vue DOM',
  'arco-design': 'Vue DOM',
  tdesign: 'Vue DOM',
  'ant-design-vue(surely-vue)': 'Vue DOM',
  vuetify: 'Vue DOM',
  primevue: 'Vue DOM',
  'v-table': 'Canvas',
  'ag-grid': 'JS DOM',
  'tanstack-virtual': 'JS DOM',
  revogrid: 'Web Component',
  'canvas-vue-table': 'Canvas',
  'simple-table': 'Vue DOM',
};

const EASE_OF_USE = {
  'stk-table-vue': {
    score: 4.5,
    note: '配置简洁、API 直观，文档完善，开箱即用',
  },
  'vxe-table': { score: 3, note: '功能全面但配置项繁多，文档庞大，学习成本高' },
  'naive-ui': { score: 4.5, note: '类型提示完善、文档清晰，虚拟表格开箱即用' },
  'element-plus': {
    score: 4,
    note: '中文文档完善、生态成熟，TableV2 部分能力需自行封装',
  },
  'arco-design': {
    score: 3.5,
    note: 'API 简洁、文档清晰，但大数据场景能力薄弱',
  },
  tdesign: { score: 3, note: '上手简单但文档细节一般，虚拟滚动配置需自行探索' },
  'ant-design-vue(surely-vue)': {
    score: 3,
    note: '继承 antd 配置体系，文档较少，hVirtual 启用需摸索',
  },
  vuetify: {
    score: 3.5,
    note: '文档完善、风格规范统一，虚拟表格 API 版本间变动大',
  },
  primevue: { score: 3, note: '文档丰富但 v4 主题体系需额外配置，上手易踩坑' },
  'v-table': { score: 3, note: 'canvas 渲染模型特殊，配置模型学习成本较高' },
  'ag-grid': {
    score: 3.5,
    note: '文档与示例完善、功能强大，但概念较多且社区版有功能限制',
  },
  'tanstack-virtual': {
    score: 3,
    note: 'headless API 简洁，但 UI、固定列、表头全需手写',
  },
  revogrid: {
    score: 3.5,
    note: 'Web Component 零配置即可用、性能强悍，但 Vue 集成需 loader 注册，文档偏底层',
  },
  'canvas-vue-table': {
    score: 2.5,
    note: 'API 简洁，但生态极小、文档少；行高硬编码最小39px无法压至28px，横向非逐列虚拟化',
  },
  'simple-table': {
    score: 3.5,
    note: 'API 现代、双虚拟开箱即用，但 Community 授权非开源可商用，需付费',
  },
};

// 读取组件库实际安装版本（读不到时返回空串）
async function versionOf(label) {
  const pkg = PACKAGE_OF[label];
  if (!pkg) return '';
  try {
    const pkgJson = JSON.parse(
      await readFile(
        path.join(ROOT, 'node_modules', pkg, 'package.json'),
        'utf-8',
      ),
    );
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
      let filePath = path.join(
        DIST,
        decodeURIComponent(new URL(req.url, BASE_URL).pathname),
      );
      try {
        await readFile(filePath);
      } catch {
        filePath = path.join(DIST, 'index.html');
      }
      const data = await readFile(filePath);
      res.setHeader(
        'Content-Type',
        MIME[path.extname(filePath)] || 'application/octet-stream',
      );
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
    const panel =
      document.querySelector('.tab-panel')?.parentElement || document.body;
    const n = panel.querySelectorAll('*').length;
    if (n > 0 && firstPaint === 0) firstPaint = performance.now() - start;
    if (n > 0 && n === prev) {
      stableCount++;
      if (stableCount >= 4) {
        return {
          ms: performance.now() - start,
          firstPaint,
          nodes: n,
          timeout: false,
        };
      }
    } else {
      stableCount = 0;
    }
    prev = n;
    await new Promise(r => setTimeout(r, 50));
  }
  return {
    ms: performance.now() - start,
    firstPaint,
    nodes: prev,
    timeout: true,
  };
};

// 滚动会话：拆分为 scroll 与 drag 两个阶段，每个阶段都是“向下滚动一段距离后再回到原位”
// 阶段 1：scrollTop 每帧一页；阶段 2：500ms 超快拖动到底再回顶
// 核心指标 = 合并两个阶段的 FPS/1%low/掉帧数；实际滚动距离为各阶段绝对位移之和
// canvas 类表格（如 VTable）没有可滚动 DOM，退化为 wheel 事件驱动
const runScrollSession = args => {
  const { maxScrollPx } = args;
  // 帧采集 + 内容变化帧统计：外部通过 stop() 结束（page.evaluate 序列化函数须自包含，故定义在内部）
  // contentFrames = 发生 DOM 内容变化的帧数：throttle/异步渲染的表格浏览器帧率虚高，
  // 但真正重绘可见行的帧少，用它可以修正出反映体感的“平滑 FPS”
  const startCollect = () => {
    const frames = [];
    let last;
    let stopped = false;
    let mutations = 0;
    let lastMutations = 0;
    let contentFrames = 0;
    const observer = new MutationObserver(() => {
      mutations++;
    });
    // 观察整个面板（而非仅滚动容器）：vxe/element 等固定列渲染在容器外的独立层。
    // 必须同时观察 childList/characterData/attributes：revogrid 等 Stencil scoped 组件
    // 更新行时常仅改文本节点 data 或 transform 属性，不产生 childList 变更；
    // Web Component（shadow DOM）内容需递归挂载 shadowRoot
    const OBSERVE_OPTS = {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    };
    const observeAll = root => {
      observer.observe(root, OBSERVE_OPTS);
      const walk = node => {
        for (const child of node.querySelectorAll('*')) {
          if (child.shadowRoot) {
            observer.observe(child.shadowRoot, OBSERVE_OPTS);
            walk(child.shadowRoot);
          }
        }
      };
      walk(root);
    };
    observeAll(getPanelRoot() || document.body);
    const loop = t => {
      if (stopped) return;
      if (last != null) frames.push(t - last);
      last = t;
      if (mutations !== lastMutations) {
        contentFrames++;
        lastMutations = mutations;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return {
      frames,
      stop: () => {
        stopped = true;
        observer.disconnect();
        // canvas 表格（VTable、canvas-vue-table）主体内容在 canvas 上逐帧重绘，
        // DOM mutation 仅来自 wrapper transform 或 overlay 等辅助元素，严重低于实际重绘频次。
        // 只要面板内存在 canvas，内容更新次数应以帧数为准（内容更新率 ≈ 帧率）
        if (getPanelRoot()?.querySelector('canvas')) {
          return frames.length;
        }
        return contentFrames;
      },
    };
  };

  const getPanelRoot = () =>
    document.querySelector('.tab-panel')?.parentElement || document.body;

  // 通用滚动容器查找：先匹配已知选择器，fallback 到 overflow 可滚动且 scrollHeight 超出可视高度的最大元素
  const findScrollContainer = () => {
    // 已知表格库的滚动容器选择器，按优先级排列
    const SCROLL_SELECTORS = [
      '.el-table-v2__main .el-vl__wrapper > div', // element TableV2
      '.stk-table', // stk-table-vue
      '.cvt', // canvas-vue-table
      '.vxe-table--scroll-y-handle', // vxe-table
      '.n-data-table-base-table-body>.v-vl', // naive-ui
      'el-table-v2__main>.el-vl__wrapper>div', // element TableV2
      '.t-table__content', // tdesign
      '.surely-table-vertical-scroll-viewport', // surely-vue
      '.v-table .v-table__wrapper', // vuetify
      '.p-datatable-table-container .p-virtualscroller', // primevue
      '.ag-body-vertical-scroll-viewport', // ag-grid
      '.tv-body', // tanstack-virtual
      'revogr-scroll-virtual', // revogrid
      '.st-body-container', // simple-table
    ];
    const panel = getPanelRoot();
    if (!panel) return null;
    for (const sel of SCROLL_SELECTORS) {
      const el = panel.querySelector(sel);
      if (el && el.scrollHeight > el.clientHeight) return el;
    }
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
    cands.sort(
      (a, b) =>
        b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight),
    );
    return cands[0];
  };

  // 查找可滚动容器；canvas 表格通常没有可滚动 DOM
  const el = findScrollContainer();

  const phaseScrollPage = () =>
    new Promise(resolve => {
      if (!el) return resolve({ method: 'scroll', moved: 0 });
      const max = Math.min(el.scrollHeight - el.clientHeight, maxScrollPx);
      if (max <= 0) return resolve({ method: 'no-scroll', moved: 0 });
      el.scrollTop = 0;
      const viewH = el.clientHeight || 600;
      const stepPx = Math.round(viewH);
      const pagesPerDirection = 4;
      let dist = 0;
      let prevTop = 0;
      let moved = 0;
      let frame = 0;
      const totalFrames = pagesPerDirection * 2;

      const step = () => {
        if (frame >= totalFrames) {
          return resolve({ method: 'scroll', moved });
        }
        const goingDown = frame < pagesPerDirection;
        if (goingDown) {
          dist = Math.min(dist + stepPx, max);
        } else {
          dist = Math.max(dist - stepPx, 0);
        }
        el.scrollTop = dist;
        const top = el.scrollTop;
        moved += Math.abs(top - prevTop);
        prevTop = top;
        frame++;
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });

  const phaseDrag = () =>
    new Promise(resolve => {
      if (!el) return resolve({ method: 'drag', moved: 0 });
      const max = Math.min(el.scrollHeight - el.clientHeight, maxScrollPx);
      if (max <= 0) return resolve({ method: 'no-scroll', moved: 0 });
      el.scrollTop = 0;
      const downDuration = 500;
      const upDuration = 300;
      const start = performance.now();
      let prevTop = 0;
      let moved = 0;

      const animate = () => {
        const now = performance.now();
        const downT = Math.min((now - start) / downDuration, 1);
        if (downT < 1) {
          el.scrollTop = Math.round(max * downT);
          const top = el.scrollTop;
          moved += Math.abs(top - prevTop);
          prevTop = top;
          return requestAnimationFrame(animate);
        }
        const upT = Math.min((now - (start + downDuration)) / upDuration, 1);
        if (upT < 1) {
          el.scrollTop = Math.round(max * (1 - upT));
          const top = el.scrollTop;
          moved += Math.abs(top - prevTop);
          prevTop = top;
          return requestAnimationFrame(animate);
        }
        resolve({ method: 'drag', moved });
      };
      requestAnimationFrame(animate);
    });

  // canvas 表格（如 VTable）无可滚动 DOM：通过合成 wheel 事件驱动其内部滚动重绘
  const phaseCanvasWheel = () =>
    new Promise(resolve => {
      const target = getPanelRoot()?.querySelector('canvas');
      if (!target) return resolve({ method: 'none', moved: 0 });
      const r = target.getBoundingClientRect();
      const stepY = Math.max(400, r.height);
      const duration = 800; // 前半下行、后半上行，时长与其他阶段对齐
      const start = performance.now();
      let down = true;
      const tick = () => {
        const now = performance.now();
        if (now - start > duration) {
          // canvas 内部滚动距离无法从 DOM 读取，记为 -1
          return resolve({ method: 'wheel', moved: -1 });
        }
        if (now - start > duration / 2) down = false;
        target.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: stepY * (down ? 1 : -1),
            clientX: r.left + r.width / 2,
            clientY: r.top + r.height / 2,
            bubbles: true,
            cancelable: true,
          }),
        );
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

  const collector = startCollect();
  const runPhases = async () => {
    if (!el) {
      // canvas 表格无可滚动 DOM：wheel 驱动两次，与其他“每阶段两次”口径一致
      await phaseCanvasWheel();
      return phaseCanvasWheel();
    }
    const t0 = performance.now();
    // 每个阶段执行两次
    const scrollResults = [await phaseScrollPage(), await phaseScrollPage()];
    const dragResults = [await phaseDrag(), await phaseDrag()];
    const dt = (performance.now() - t0) / 1000;
    const totalMoved = [...scrollResults, ...dragResults]
      .reduce((sum, r) => sum + Math.max(r.moved, 0), 0);
    const pxPerSec = dt > 0.2 ? Math.round(totalMoved / dt) : 0;
    return { method: 'scroll+drag', moved: totalMoved, pxPerSec };
  };
  return runPhases().then(drive => {
    const contentUpdates = collector.stop();
    return { frames: collector.frames, contentUpdates, ...drive };
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
  const p99 =
    sorted[Math.max(0, Math.floor(frames.length * 0.01) - 1)] ?? sorted[0];
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

  console.log(
    '[3/4] 启动 chromium（headed 模式，接近真实浏览器体感）执行测试...',
  );
  const browser = await chromium.launch({
    headless: false,
    args: ['--enable-precise-memory-info'],
  });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
  });
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

  // 预检测：跳过没有真实表格组件的 tab
  const skip = new Set();
  for (let i = 0; i < buttons.length; i++) {
    await buttons[i].click();
    await page.waitForTimeout(300);
    const hasTable = await page.evaluate(() => {
      const root =
        document.querySelector('.tab-panel')?.parentElement || document.body;
      if (root.querySelector('canvas')) return true;
      // 特例：element TableV2 / stk-table 的滚动容器是 overflow:hidden，无法用通用规则检测
      if (root.querySelector('.el-table-v2__main .el-vl__wrapper > div'))
        return true;
      if (root.querySelector('.stk-table')) return true;
      const cands = [...root.querySelectorAll('*')].filter(el => {
        const s = getComputedStyle(el);
        return (
          /(auto|scroll|overlay)/.test(s.overflowY) &&
          el.scrollHeight - el.clientHeight > 50
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
    const heap0 = await page.evaluate(
      () => performance.memory?.usedJSHeapSize || 0,
    );

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
    const roundContentUpdates = [];
    const roundContentUpdateRates = [];
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
        const fs = frameStats(s.frames);
        roundStats.push(fs);
        ltScrollAll.push(...lt);
        if (typeof s.contentUpdates === 'number') {
          roundContentUpdates.push(s.contentUpdates);
          if (fs && fs.scrollDuration > 0) {
            roundContentUpdateRates.push(
              s.contentUpdates / (fs.scrollDuration / 1000),
            );
          }
        }
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

    const heap1 = await page.evaluate(
      () => performance.memory?.usedJSHeapSize || 0,
    );

    const sum = arr => Math.round(arr.reduce((a, b) => a + b, 0));
    const usability = USABILITY[label] || {
  fixed: 0,
  rowHeight: 0,
  hVirtual: 0,
  width: 0,
  filtering: 0,
  sorting: 0,
  editing: 0,
  export: 0,
};
usability.noBlank = usability.noBlank !== undefined
  ? usability.noBlank
  : (roundBlanks.length === 0 ? 1 : 0);
// 计算功能丰富度总分（12 个维度，满分 12 分）
const FEATURE_KEYS = ['fixed', 'rowHeight', 'hVirtual', 'width', 'filtering', 'sorting', 'editing', 'export', 'treeExpand', 'cellMerge', 'headerGroup', 'rangeSelection'];
usability.featureScore = FEATURE_KEYS.reduce((s, k) => s + (Number(usability[k]) || 0), 0);
    // 平滑 FPS = min(浏览器帧率, 内容更新帧率)：被 throttle 的表格内容更新少，体感帧率被拉低
    const contentUpdateRateVal = roundContentUpdateRates.length
      ? +median(roundContentUpdateRates).toFixed(1)
      : null;
    const smoothFpsVal =
      stats && contentUpdateRateVal != null
        ? +Math.min(stats.avgFps, contentUpdateRateVal).toFixed(1)
        : '-';
    results.push({
      table: label,
      url: URL_MAP[label] || '',
      renderType: RENDER_TYPE[label] || 'Vue DOM',
      version,
      renderMs,
      firstPaintMs: Math.round(render.firstPaint),
      domNodes: render.nodes,
      renderLongTaskMs: sum(ltRender),
      scrollMethod: method,
      scrolledPx: Math.round(moved),
      pxPerSec: roundPxs.length ? Math.round(median(roundPxs)) : '-',
      blankPct: roundBlanks.length ? +median(roundBlanks).toFixed(1) : '-',
      contentUpdates:
        roundContentUpdates.length ? Math.round(median(roundContentUpdates)) : '-',
      contentUpdateRate: contentUpdateRateVal ?? '-',
      smoothFps: smoothFpsVal,
      avgFps: stats?.avgFps ?? '-',
      lowFps1pct: stats?.lowFps1pct ?? '-',
      p99FrameMs: stats?.p99FrameMs ?? '-',
      worstFrameMs: stats?.worstFrameMs ?? '-',
      droppedFrames: stats?.dropped ?? '-',
      scrollLongTaskMs: sum(ltScroll),
      heapDeltaMB: +((heap1 - heap0) / 1048576).toFixed(1),
      timeout: render.timeout,
      usability,
      easeOfUse: EASE_OF_USE[label] || { score: 0, note: '' },
    });
    const r = results[results.length - 1];
    console.log(
      ` 渲染 ${r.renderMs}ms | 无白屏速度 ${r.pxPerSec}px/s | 平滑 ${r.smoothFps}fps（浏览器 ${r.avgFps}fps / 内容更新 ${r.contentUpdateRate}/s）| 1%low ${r.lowFps1pct}fps`,
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
      内容更新次数: r.contentUpdates,
      内容更新率: r.contentUpdateRate,
      平滑FPS: r.smoothFps,
      平均FPS: r.avgFps,
      '1%low FPS': r.lowFps1pct,
      'p99帧(ms)': r.p99FrameMs,
      '最差帧(ms)': r.worstFrameMs,
      掉帧数: r.droppedFrames,
      '滚动长任务(ms)': r.scrollLongTaskMs,
      '堆增量(MB)': r.heapDeltaMB,
      '功能丰富度(x/12)':
        r.usability.featureScore + '/12',
      '易用性(x/5)': (r.easeOfUse && r.easeOfUse.score) || '-',
    })),
  );

  // 功能丰富度统计：各特性支持（含部分）的组件数量
  const FEATURE_DIMS = [
    ['fixed', '列固定'],
    ['rowHeight', '行高控制'],
    ['hVirtual', '横向虚拟列表'],
    ['width', '宽度控制'],
    ['filtering', '列筛选'],
    ['sorting', '列排序'],
    ['editing', '单元格编辑'],
    ['export', '导出'],
    ['treeExpand', '树形/展开行'],
    ['cellMerge', '合并单元格'],
    ['headerGroup', '表头分组'],
    ['rangeSelection', '区域选择'],
  ];
  for (const [key, name] of FEATURE_DIMS) {
    const ok = results.filter(r => r.usability[key] === 1).length;
    const part = results.filter(r => r.usability[key] === 0.5).length;
    console.log(
      `  功能丰富度·${name}: 支持 ${ok}/${results.length}，部分 ${part}/${results.length}`,
    );
  }
  const easeAvg = (
    results.reduce((s, r) => s + (r.easeOfUse?.score || 0), 0) / results.length
  ).toFixed(1);
  console.log(
    `  易用性·主观评分: 平均 ${easeAvg}/5（最高 ${Math.max(...results.map(r => r.easeOfUse?.score || 0))}）`,
  );

  const jsonPath = path.join(__dirname, 'perf-results.json');
  const reportPath = path.join(__dirname, 'perf-report.html');
  const { writeFile } = await import('node:fs/promises');
  await writeFile(jsonPath, JSON.stringify(results, null, 2), 'utf-8');

  // 由模板生成 HTML 报告（内联数据，单文件即可打开）
  // 注意：替换内容用函数形式避免 $&/$$ 特殊模式；replaceAll 保证注释中的占位符也一并替换
  const template = await readFile(
    path.join(__dirname, 'report-template.html'),
    'utf-8',
  );
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
      const pathname = decodeURIComponent(
        new URL(req.url, 'http://x/').pathname,
      );
      let filePath = path.join(__dirname, pathname);
      try {
        await readFile(filePath);
      } catch {
        filePath = reportPath;
      }
      const data = await readFile(filePath);
      res.setHeader(
        'Content-Type',
        MIME[path.extname(filePath)] || 'application/octet-stream',
      );
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
        if (err.code === 'EADDRINUSE' && port < REPORT_PORT + 10)
          tryListen(port + 1);
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
  opener.on('error', () =>
    console.log('自动打开浏览器失败，请手动访问上方地址'),
  );
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
