<template>
  <div>
    <h2>element-plus table</h2>
    <ul>
      <li>固定列用不了</li>
      <li>需要设置宽度</li>
    </ul>
    <TableV2
      row-key="id"
      fixed
      :height="600"
      :max-height="600"
      :width="800"
      :columns
      :data="tableData"
    ></TableV2>
  </div>
</template>

<script setup>
import { TableV2, TableV2FixedDir } from 'element-plus';
import { computed } from 'vue';
import { tableColumns, tableData } from '../stk-table/props.js';
import 'element-plus/theme-chalk/index.css';
const fixedMap = {
  left: TableV2FixedDir.LEFT,
  right: TableV2FixedDir.RIGHT,
};
const columns = computed(() =>
  tableColumns.map(it => ({
    key: it.dataIndex,
    dataKey: it.dataIndex,
    title: it.title,
    width: it.width,
    // fixed: fixedMap[it.fixed],
    // align: it.align,
    // titleAlign: it.headerAlign,
  })),
);
// Your script code here
</script>
