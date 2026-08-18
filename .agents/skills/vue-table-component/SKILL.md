---
name: "vue-table-component"
description: "在 Vue 虚拟表格性能对比项目中新增或更新一个表格组件。组件必须满足 README「新表格接入规范」（行高28px、竖向边框、左右固定列、600px高度、横纵双虚拟滚动）。升级版本、修复兼容性、调试组件、注册 Tab、更新 perf 测试配置与报告。当用户要求"新增/接入/升级/修复某个表格组件"时调用。"
---

# Vue Virtual Table 组件接入 Skill

本 Skill 用于管理 `vue-virtual-table-benchmark` 项目（`src/vue/` 下各表格组件）的新增与更新。所有组件必须统一满足 [README.md](README.md) 的「新表格接入规范」，保证各库处于同一测试口径。

## 触发条件

用户要求：新增/接入一个表格组件库、升级某个组件的版本、修复/调试某个组件的规范兼容性、或让某个组件重新可正常运行并刷新性能数据。

## 核心规范（README「新表格接入规范」）

| 规范项 | 要求 |
| --- | --- |
| 行高 | 28px，且**虚拟滚动计算值与视觉行高必须一致**（需实测确认，不能只看 API）；库不支持直接设置时用 CSS 压到 28px（参考 `src/vue/AntdvTable.vue`） |
| 竖向边框 | 列间须有竖向分隔线；库默认不开时用对应开关（如 canvas-vue-table 的 `bordered`）或 CSS 开启 |
| 左右固定列 | 支持；正确映射 `src/stk-table/props.js` 中 `tableColumns` 的 `fixed`（Name/Age 左固定，R/Operate 右固定） |
| 表格高度 | 600px |
| 虚拟列表 | 横向 + 纵向均开启，缺一不可 |

**不支持项必须显式列出**：若所选库原生不支持以上某项（禁止强行模拟），需在组件模板顶部用 `ul > li` 逐条列出不支持项并附原因（参考 `src/vue/NaiveTable.vue`、`src/vue/ArcoTable.vue`）。

## 关键文件

- `README.md`：接入规范、被测表格清单（需要同步更新）
- `src/stk-table/props.js`：`tableColumns`（列定义，含 fixed/width/align）与 `tableData`（10000 行数据），所有组件统一复用
- `src/vue/<Name>Table.vue`：各表格组件实现
- `src/vue/App.vue`：`tabs` 数组，用 `defineAsyncComponent` 注册每个表格 Tab
- `package.json`：`dependencies` 中组件库版本
- `perf/run-perf.mjs`：性能测试脚本，需维护 `PACKAGE_OF`、`USABILITY`、`EASE_OF_USE` 三个映射
- `perf/perf-results.json`、`perf/perf-report.html`：性能数据与可视化报告（由 `npm run perf` 生成）

## 工作流程

先判断是「更新已有组件」还是「新增组件」，据此执行对应流程。

### 一、更新已有组件

1. **定位组件**：在 `src/vue/` 下找到对应 `.vue`，确认其在 `App.vue` 的 `tabs` 中的 `key`/`label`。
2. **升级版本**：
   - 在 `package.json` 的 `dependencies` 中升级目标库版本（去掉固定版本号或用 `npm install <pkg>@latest`），执行 `npm install`。
   - 确认 `perf/run-perf.mjs` 的 `PACKAGE_OF` 中该库的包名映射正确（脚本会自动读取实际安装版本）。
3. **调试规范兼容**：按核心规范逐项核查组件，**优先按官方文档**配置固有能力（如虚拟滚动、固定列、行高 API）；库原生不支持时用 CSS 处理或显式列出不支持项。目标：`npm run dev` 后组件可正常渲染、可横纵滚动、固定列正确、行高视觉为 28px。
4. **更新可用性/易用性评估**：核对 `perf/run-perf.mjs` 的 `USABILITY[label]`（fixed/rowHeight/hVirtual/width，取值 1/0.5/0）与 `EASE_OF_USE[label]`（score 与 note），据实更新。
5. **更新 README**：若被测表格清单或说明有变化，同步更新 README。
6. **刷新性能数据**：运行 `npm run perf` 生成最新的 `perf-results.json` 与 `perf-report.html`，确认新版本数据已写入。

### 二、新增组件

1. **确认识别**：确认要接入的组件库名称（npm 包名）与是否为表格组件（非表格的通用虚拟列表组件不加入排名，仅保留实现，参考 `App.vue` 注释）。
2. **安装最新版**：`npm install <pkg>`（安装最新版本），加入 `dependencies`。
3. **查阅官方文档**：用官方文档确认该库的虚拟滚动（纵向+横向）、固定列、行高、高度控制的标准用法与 API。
4. **创建组件**：在 `src/vue/` 新建 `<Name>Table.vue`，遵循既有组件模板结构：
   - `<template>`：`<div>` 顶部的 `<h2>` 标题，需要时用 `<ul><li>` 列出不支持项；再渲染表格组件。
   - `<script setup>`：从 `../stk-table/props.js` 引入 `tableColumns`、`tableData`；用 `computed` 将该库的列配置字段映射为 `dataIndex/width/fixed/align` 等；**复用** `tableColumns` 的 `fixed`（Name/Age 左固定、R/Operate 右固定）与所有列宽；导入该库样式。
   - 高度 600px、行高尽量 28px（原生 API 或 CSS）。
   - 参考现有实现：横向滚动宽度可用 `tableColumns.reduce((sum, it) => sum + it.width, 0)` 计算。
5. **注册 Tab**：在 `src/vue/App.vue` 的 `tabs` 数组新增一项，`key` 唯一、`label` 为库名、`comp` 用 `defineAsyncComponent(() => import('./<Name>Table.vue'))`。
6. **调试**：`npm run dev` 在当前浏览器访问，逐项验证规范（行高/固定列/600px/横纵虚拟滚动），不满足则修复；确认组件可正常运行。
7. **更新 perf 配置**：在 `perf/run-perf.mjs` 的三处映射中新增该库：
   - `PACKAGE_OF[label]`：npm 包名。
   - `USABILITY[label]`：根据组件实际支持情况填 1/0.5/0。
   - `EASE_OF_USE[label]`：接入过程中的主观评分与说明。
8. **更新 README**：在「被测表格」列表加入该库。
9. **刷新性能数据**：运行 `npm run perf` 生成最新的 `perf-results.json` 与 `perf-report.html`，确认新组件数据已写入。

## 验收标准

- 组件在 `npm run dev` 下可运行，无控制台报错。
- 满足核心规范：行高 28px、竖向边框、左右固定列正确、高度 600px、横纵双虚拟滚动；不支持项在模板顶部显式列出。
- `App.vue` 已注册 Tab，可切换查看。
- `npm run perf` 成功，`perf-results.json` 已包含该组件最新版本数据，`perf-report.html` 已更新。

## 注意事项

- 不要修改 `src/stk-table/props.js` 的 `tableColumns`/`tableData` 定义（各库统一口径）。
- 不新增文件除非必要；优先复用现有构造（`computed` 列映射、`reduce` 算滚动宽度）。
- 虚拟滚动能力禁止强行模拟；库原生不支持时显式列出而非伪造。
- 行高必须**实测视觉高度**（用 DevTools 量取），不要只凭 API 名判断；`min-height`/`min-item-height` 这类"最小值"不等于最终行高。
- canvas 渲染类表格（如 canvas-vue-table）常把行高硬编码进绘制逻辑（行高+内边距常量），CSS 无法压缩，此时须如实把"行高28px"列为不支持项，并把 `perf/run-perf.mjs` 的 `USABILITY` 中该库 `rowHeight` 置 0。
- 竖向边框默认关闭的库（如 canvas-vue-table）须用 `bordered` 等开关开启，否则列为不支持项。
- Web Component 类表格（如 RevoGrid）须在应用启动时（`src/vue/app.js`）全局注册一次自定义元素，避免在懒加载 chunk 内注册后被 HMR 热替换导致构造函数失效；列/数据需通过 ref 直接赋属性（而非 HTML 属性）。
- 更新组件后必须重新运行 `npm run perf`，否则报告数据会停留在旧版本。
- arco-design-vue 的滚动事件有节流（throttle）机制，快速滚动时内容更新跟不上，导致出现白屏帧。这是库自身行为，非 perf 脚本问题。
- vuetify 快速滚动时也存在白屏问题，原因同上，是库自身渲染调度行为。
- tDesign 快速滚动时也存在白屏问题，原因同上。