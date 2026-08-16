# Vue Virtual Table Benchmark

Vue 各表格组件库渲染与虚拟滚动性能对比基准测试。

被测表格：

* stk-table-vue
* element-plus
* ant-design-vue
* vxe-table
* @arco-design/web-vue
* naive-ui
* tdesign-vue-next
* vTable
* AgGrid
* tanstack table
* RevoGrid
* canvas-vue-table
* @simple-table/vue

## 新表格接入规范

新增对比表格必须满足以下统一配置，保证各库处于同一测试口径：

| 规范项 | 要求 | 说明 |
| --- | --- | --- |
| 行高 | 28px | 虚拟滚动计算值与视觉行高必须一致；库不支持直接设置时用 CSS 压到 28px（参考 `src/vue/AntdvTable.vue`） |
| 左右固定列 | 支持 | 正确映射 `src/stk-table/props.js` 中 `tableColumns` 的 `fixed`（Name/Age 左固定，R/Operate 右固定） |
| 表格高度 | 600px | 可视区高度统一 600px |
| 虚拟列表 | 横向 + 纵向均开启 | 纵向虚拟滚动与横向虚拟滚动缺一不可 |

**不支持项必须列在页面中**：若所选库原生不支持以上某项能力（禁止强行模拟），需在组件模板顶部用 `ul > li` 逐条列出不支持项并附原因（参考 `src/vue/NaiveTable.vue`、`src/vue/ArcoTable.vue`）。

## 运行

```bash
npm install
npm run dev
```

打开页面后，滚动表格，体验各表格的性能差异。

## 自动化性能测试

```bash
npm run perf
```

流程：rspack 生产构建 → Playwright(headed chromium) 逐表格测量渲染耗时与无白屏滚动速度 → 生成 `perf/perf-results.json` 与 `perf/perf-report.html`（echarts 可视化报告）。

## 在线报告

最新性能报告通过 GitHub Pages 发布：<https://ja-plus.github.io/vue-virtual-table-benchmark/perf-report.html>

每次 push 到 `master`/`main` 时，GitHub Actions（`.github/workflows/deploy-pages.yml`）会自动将 `perf/perf-report.html` 部署到 Pages；也可在 Actions 页面手动触发 `workflow_dispatch` 发布。
