<template>
  <div>
    <h2>tanstack-virtual</h2>
    <ul>
      <li>不支持左右固定列</li>
      <li>不支持横向虚拟滚动：整行渲染，仅容器横向滚动</li>
    </ul>
    <div ref="scrollEl" class="tv-body" @scroll="syncHead">
      <div ref="theadEl" class="thead" :style="{ width: totalWidth + 'px' }">
        <span
          v-for="col in tableColumns"
          :key="col.dataIndex"
          class="v-cell head-cell"
          :style="{
            width: col.width + 'px',
            textAlign: col.headerAlign || 'left',
          }"
        >
          {{ col.title }}
        </span>
      </div>
      <div
        :style="{
          height: virtualizer.getTotalSize() + 'px',
          position: 'relative',
        }"
      >
        <div
          v-for="row in virtualItems"
          :key="row.key"
          class="v-row"
          :style="{
            width: totalWidth + 'px',
            transform: 'translateY(' + row.start + 'px)',
          }"
        >
          <span
            v-for="col in tableColumns"
            :key="col.dataIndex"
            class="v-cell"
            :style="{ width: col.width + 'px', textAlign: col.align || 'left' }"
          >
            {{ tableData[row.index][col.dataIndex] ?? '' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useVirtualizer } from '@tanstack/vue-virtual';
import { tableColumns, tableData } from '../stk-table/props.js';

// 列宽总和（行与表头横向对齐）
const totalWidth = computed(() =>
  tableColumns.reduce((sum, col) => sum + (col.width || 100), 0),
);

const scrollEl = ref(null);
const theadEl = ref(null);

// headless 虚拟化核心：只负责可见行计算，渲染完全由模板控制
const virtualizer = useVirtualizer({
  count: tableData.length,
  getScrollElement: () => scrollEl.value,
  estimateSize: () => 28,
  overscan: 10,
});
const virtualItems = computed(() => virtualizer.value.getVirtualItems());

// 表头与滚动区域横向滚动同步
const syncHead = e => {
  if (theadEl.value) theadEl.value.scrollLeft = e.target.scrollLeft;
};
</script>

<style scoped>
.tv-body {
  height: 600px;
  overflow: auto;
  border: 1px solid #e8e8e8;
}

.thead {
  position: sticky;
  top: 0;
  z-index: 1;
  height: 28px;
  display: flex;
  align-items: center;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  overflow: hidden;
}

.v-row {
  position: absolute;
  top: 0;
  left: 0;
  height: 28px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #e8e8e8;
  font-size: 12px;
  color: #333;
}

.v-cell {
  flex: 0 0 auto;
  padding: 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-right: 1px solid #f0f0f0;
  box-sizing: border-box;
}

.head-cell {
  font-weight: 500;
  color: #666;
}
</style>
