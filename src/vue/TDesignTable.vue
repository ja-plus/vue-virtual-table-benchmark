<template>
  <div>
    <h2>
      TDesign-vue-next
      <a
        href="https://tdesign.tencent.com/vue-next/components/table#%E8%99%9A%E6%8B%9F%E6%BB%9A%E5%8A%A8%E7%9A%84%E8%A1%A8%E6%A0%BC"
        target="_blank"
        >table</a
      >
    </h2>
    <ul>
      <li>fixed right 覆盖fixed left</li>
      <li>设置行高不便。只能设置参考行高。需要通过css设置行高。</li>
    </ul>
    <Table
      row-key="id"
      bordered
      hover
      cell-empty-content="--"
      :height="600"
      :scroll="{ type: 'virtual', rowHeight: 28, bufferSize: 10 }"
      :columns
      :data="tableData"
    ></Table>
  </div>
</template>
<script setup>
import { Table } from 'tdesign-vue-next/esm/table/index.js';
import { computed } from 'vue';
import { tableColumns, tableData } from '../stk-table/props.js';

import 'tdesign-vue-next/es/style/index.css';

const columns = computed(() =>
  tableColumns.map(it => ({
    colKey: it.dataIndex,
    title: it.title,
    width: it.width,
    fixed: it.fixed,
    align: it.align,
    titleAlign: it.headerAlign,
  })),
);
</script>
<style lang="less">
.t-table {
  --td-comp-paddingTB-m: 2px;
}
</style>
