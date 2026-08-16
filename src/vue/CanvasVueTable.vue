<template>
  <div>
    <h2>canvas-vue-table</h2>
    <ul>
      <li>行高无法精确控制为 28px：内部硬编码单行行高 23px + 上下内边距 16px，单行最小 39px，min-item-height 对其无效</li>
      <li>横向为整行 canvas 原生滚动，非逐列虚拟化</li>
    </ul>
    <CanvasVirtualList
      :columns="columns"
      :items="tableData"
      :height="600"
      :min-item-height="28"
      bordered
      :theme="{ border: '#ebeef5' }"
    ></CanvasVirtualList>
  </div>
</template>

<script setup>
import { CanvasVirtualList } from 'canvas-vue-table';
import '../../node_modules/canvas-vue-table/dist/style.css';
import { tableColumns, tableData } from '../stk-table/props.js';

// canvas-vue-table 列定义：field=数据字段, title=表头, width=列宽, fixed=固定位置
const columns = tableColumns.map(it => ({
  field: it.dataIndex,
  title: it.title,
  width: it.width,
  fixed: it.fixed,
  align: it.align,
}));
</script>