<template>
  <div>
    <h2>vue-virtual-scroller</h2>
    <ul>
      <li>不支持左右固定列</li>
      <li>不支持横向虚拟滚动：整行渲染，仅容器横向滚动，表头同步跟随</li>
    </ul>
    <div class="table-box">
      <div ref="theadEl" class="thead">
        <div class="thead-inner" :style="{ width: totalWidth + 'px' }">
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
      </div>
      <RecycleScroller
        class="vrs-body"
        :items="tableData"
        :item-size="28"
        key-field="id"
        :buffer="10"
        @scroll="syncHead"
      >
        <template #default="{ item }">
          <div class="v-row" :style="{ width: totalWidth + 'px' }">
            <span
              v-for="col in tableColumns"
              :key="col.dataIndex"
              class="v-cell"
              :style="{
                width: col.width + 'px',
                textAlign: col.align || 'left',
              }"
            >
              {{ item[col.dataIndex] ?? '' }}
            </span>
          </div>
        </template>
      </RecycleScroller>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { RecycleScroller } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import { tableColumns, tableData } from '../stk-table/props.js';

// 列宽总和（行与表头横向对齐）
const totalWidth = computed(() =>
  tableColumns.reduce((sum, col) => sum + (col.width || 100), 0),
);

// 表头与滚动区域横向滚动同步
const theadEl = ref(null);
const syncHead = e => {
  if (theadEl.value) theadEl.value.scrollLeft = e.target.scrollLeft;
};
</script>

<style scoped>
.table-box {
  height: 600px;
  display: flex;
  flex-direction: column;
  border: 1px solid #e8e8e8;
}

.thead {
  flex: 0 0 28px;
  display: flex;
  align-items: center;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  overflow: hidden;
}

.thead-inner {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.vrs-body {
  flex: 1;
  height: 572px;
  overflow-x: auto !important;
}

/* RecycleScroller 默认把 item 容器裁成容器宽度，需放开才能让超宽行撑出横向滚动条 */
.vrs-body :deep(.vue-recycle-scroller__item-wrapper) {
  overflow: visible !important;
  width: auto !important;
  flex: none !important;
}

.vrs-body :deep(.vue-recycle-scroller__item-view) {
  width: auto !important;
}

.v-row {
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
