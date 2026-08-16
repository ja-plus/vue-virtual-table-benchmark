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

最新性能报告通过 GitHub Pages 发布：<https://ja-plus.github.io/vue-table-compare/perf-report.html>

每次 push 到 `master`/`main` 时，GitHub Actions（`.github/workflows/deploy-pages.yml`）会自动将 `perf/perf-report.html` 部署到 Pages；也可在 Actions 页面手动触发 `workflow_dispatch` 发布。
