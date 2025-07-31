<template>
  <div>
    <h2>naive ui table</h2>
    <ul>
      <li>不支持直接设置行高。css设置。</li>
      <li>不支持横向虚拟滚动</li>
      <li>*滚动无白屏</li>
      <li>右固定列无阴影。</li>
    </ul>
    <NDataTable
      size="small"
      virtual-scroll
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
</script>
<style lang="less">
.n-data-table {
  --n-td-padding: 3px 8px !important;
}
</style>
