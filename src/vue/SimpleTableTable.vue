<template>
  <div>
    <h2>@simple-table/vue</h2>
    <ul>
      <li>Community 授权（source-available），非开源可商用：有营收需付费购买 Pro/Enterprise</li>
    </ul>
    <SimpleTable
      :rows="tableData"
      :columns="columns"
      :height="600"
      :custom-theme="{ rowHeight: 28 }"
      column-borders
    ></SimpleTable>
  </div>
</template>

<script setup>
import { SimpleTable } from '@simple-table/vue';
import '@simple-table/vue/styles.css';
import { tableColumns, tableData } from '../stk-table/props.js';

// @simple-table/vue 列定义：accessor=数据字段, label=表头, width=列宽, pinned=固定位置
const columns = tableColumns.map(it => ({
  accessor: it.dataIndex,
  label: it.title,
  width: it.width,
  pinned: it.fixed,
  align: it.align,
}));
</script>