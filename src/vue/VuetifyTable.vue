<template>
  <div>
    <h2>vuetify VDataTableVirtual</h2>
    <ul>
      <li>固定表头 fixed-header</li>
      <li>不支持左右固定列</li>
      <li>不支持横向虚拟滚动：整行渲染，仅容器横向滚动</li>
    </ul>
    <VDataTableVirtual
      :style="{ '--vt-table-min-width': scrollX + 'px' }"
      :headers="headers"
      :items="tableData"
      item-height="28"
      height="600"
      fixed-header
      hover
    />
  </div>
</template>

<script setup>
import { computed, getCurrentInstance } from 'vue';
import { createVuetify } from 'vuetify';
import { VDataTableVirtual } from 'vuetify/lib/components/VDataTable/index.mjs';
import 'vuetify/lib/components/VDataTable/VDataTable.css';
import 'vuetify/lib/components/VTable/VTable.css';
import 'vuetify/lib/components/VVirtualScroll/VVirtualScroll.css';
import { tableColumns, tableData } from '../stk-table/props.js';

// vuetify 依赖 app.use 注入的 defaults/theme，模块级单例安装一次即可
const vuetify = createVuetify();
let installed = false;
function ensureVuetify() {
  if (installed) return;
  installed = true;
  getCurrentInstance().appContext.app.use(vuetify);
}
ensureVuetify();

const headers = computed(() =>
  tableColumns.map(c => ({
    title: c.title,
    key: c.dataIndex,
    width: c.width,
    align: c.align === 'right' ? 'end' : 'start',
  })),
);
const scrollX = tableColumns.reduce((sum, it) => sum + it.width, 0);
</script>

<style>
/* vuetify 默认 table width:100% + auto 布局，列宽会被压缩；fixed 布局按表头宽度渲染，min-width 撑出横向滚动。
   本项目未加载 vuetify 全局 reset（content-box），需统一 border-box，width 才含 padding，列宽和=scrollX 无压缩 */
.v-table > .v-table__wrapper > table,
.v-table > .v-table__wrapper > table th,
.v-table > .v-table__wrapper > table td {
  box-sizing: border-box;
}
.v-table > .v-table__wrapper > table {
  table-layout: fixed;
  min-width: var(--vt-table-min-width, 100%);
}
.v-data-table__th,
.v-data-table__td {
  height: 28px !important;
  padding: 0 8px !important;
  font-size: 12px;
  /* 纵向格线与横线同色 */
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
