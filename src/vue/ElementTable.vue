<template>
  <div>
    <h2>element-plus table</h2>
    <ul>
      <li>需要设置高度，宽度且不能用百分比，通过 ResizeObserver 监听容器宽度实现铺满</li>
    </ul>
    <div ref="wrapRef" style="width:100%">
      <TableV2
        v-if="tableWidth"
        row-key="id"
        fixed
        :height="600"
        :width="tableWidth"
        :row-height="28"
        :columns
        :data="tableData"
      ></TableV2>
    </div>
  </div>
</template>

<script setup>
import {
  TableV2,
  TableV2FixedDir,
} from 'element-plus/es/components/table-v2/index.mjs';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
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
    fixed: fixedMap[it.fixed],
    align: it.align,
    titleAlign: it.headerAlign,
  })),
);

// TableV2 的 width 只支持数字，监听容器尺寸变化实现宽度自适应铺满
const wrapRef = ref(null);
const tableWidth = ref(0);
let resizeObserver;
let rafId;
onMounted(() => {
  resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const width = Math.floor(entry.contentRect.width);
      // 宽度无变化时跳过；更新推迟到下一帧，避免在 observer 回调中同步触发布局
      // 变化形成循环，触发 "ResizeObserver loop completed with undelivered notifications"
      if (width > 0 && width !== tableWidth.value) {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          tableWidth.value = width;
        });
      }
    }
  });
  resizeObserver.observe(wrapRef.value);
});
onBeforeUnmount(() => {
  cancelAnimationFrame(rafId);
  resizeObserver?.disconnect();
});
</script>

<style>
/* TableV2 无 bordered 配置，竖线用 CSS 补：与其它表格保持纵向格线一致 */
.el-table-v2__header-cell,
.el-table-v2__row-cell {
  border-right: 1px solid var(--el-table-border-color, #ebeef5);
}
</style>
