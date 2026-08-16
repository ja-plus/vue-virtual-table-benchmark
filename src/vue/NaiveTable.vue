<template>
  <div>
    <h2>naive ui table</h2>
    <ul>
      <li>不支持直接设置行高。css设置。</li>
      <li>横向虚拟滚动（virtual-scroll-x）在 2.44.1 有 fixed 列错位 bug，改用普通虚拟滚动 + scroll-x</li>
    </ul>
    <NDataTable
      size="small"
      virtual-scroll
      :scroll-x="scrollX"
      :bordered="false"
      :single-line="false"
      :row-key="it => it.id"
      :max-height="600"
      :columns="columns"
      :data="tableData"
    >
    </NDataTable>
  </div>
</template>

<script setup>
import { NDataTable } from 'naive-ui/es/data-table/index.mjs';
import { computed } from 'vue';
import { tableColumns, tableData } from '../stk-table/props.js';

const columns = computed(() =>
  tableColumns.map(it => ({
    key: it.dataIndex,
    title: it.dataIndex,
    width: it.width,
    fixed: it.fixed,
    align: it.align,
    titleAlign: it.headerAlign,
  })),
);
const scrollX = tableColumns.reduce((sum, it) => sum + it.width, 0);
</script>
<style lang="less">
.n-data-table {
  --n-td-padding: 3px 8px !important;
}
</style>
