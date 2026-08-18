<template>
  <div>
    <h2>ant-design-vue (Surely Vue Table)</h2>
    <ul>
      <li>4.x Table 不支持虚拟滚动，接入同团队的 Surely Vue Table</li>
      <li>商业组件，可免费使用但带水印</li>
      <li>横向虚拟滚动仅往后追加单元格，已滚出左侧的单元格不移除，不支持完整横向虚拟化</li>
      <li>rowHeight 仅用于虚拟计算，视觉行高需 css 配合，已统一为 28px</li>
    </ul>
    <STable
      row-key="id"
      bordered
      size="small"
      :pagination="false"
      :row-height="28"
      :columns="columns"
      :data-source="tableData"
      :height="600"
      :scroll="{ x: scrollX }"
    ></STable>
  </div>
</template>

<script setup>
import { STable } from '@surely-vue/table';
import '@surely-vue/table/dist/index.css';
import { computed } from 'vue';
import { tableColumns, tableData } from '../stk-table/props.js';

const columns = computed(() =>
  tableColumns.map(it => ({
    dataIndex: it.dataIndex,
    title: it.title,
    width: it.width,
    fixed: it.fixed,
    align: it.align,
  })),
);
const scrollX = tableColumns.reduce((sum, it) => sum + it.width, 0);
</script>

<style lang="less">
// rowHeight 只影响虚拟滚动计算，实际行高需通过 css 压到 28px 保持一致
.surely-table .surely-table-body-cell {
  height: 28px;
  box-sizing: border-box;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
