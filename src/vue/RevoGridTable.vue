<template>
  <div>
    <h2>RevoGrid</h2>
    <revo-grid
      ref="gridRef"
      :row-size="28"
      style="height: 600px"
    ></revo-grid>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { tableColumns, tableData } from '../stk-table/props.js';

// RevoGrid 自定义元素已在 app.js 启动时全局注册，此处不再重复 defineCustomElements。

// RevoGrid 列定义：prop=数据字段, name=表头, size=列宽, pin=固定位置
const columns = tableColumns.map(it => ({
  prop: it.dataIndex,
  name: it.title,
  size: it.width,
  pin: it.fixed === 'left' ? 'colPinStart' : it.fixed === 'right' ? 'colPinEnd' : undefined,
}));

// Web Component 集成：columns/source 需作为属性（而非 HTML 属性）传入，
// 因此在 onMounted 中通过 ref 直接赋值，避免 Vue 把对象当字符串属性处理。
// 使用 requestAnimationFrame 延迟设置，确保 Web Component 的 connectedCallback 已执行，
// 避免 localScrollService 未初始化导致的 setParams 错误。
const gridRef = ref(null);
onMounted(() => {
  const grid = gridRef.value;
  if (!grid) return;
  requestAnimationFrame(() => {
    grid.columns = columns;
    grid.source = tableData;
  });
});
</script>