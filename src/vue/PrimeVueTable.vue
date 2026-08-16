<template>
  <div>
    <h2>primevue DataTable</h2>
    <ul>
      <li>frozen 左右固定列</li>
      <li>虚拟滚动 virtualScrollerOptions</li>
    </ul>
    <DataTable
      :value="tableData"
      scrollable
      scroll-height="600px"
      :virtual-scroller-options="{ itemSize: 28, numToleratedItems: 5 }"
    >
      <Column
        v-for="col in tableColumns"
        :key="col.dataIndex"
        :field="col.dataIndex"
        :header="col.title"
        :frozen="!!col.fixed"
        :align-frozen="col.fixed === 'right' ? 'right' : 'left'"
        :style="{ width: col.width + 'px' }"
        :header-style="{ width: col.width + 'px' }"
      />
    </DataTable>
  </div>
</template>

<script setup>
import { getCurrentInstance } from 'vue';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { tableColumns, tableData } from '../stk-table/props.js';

// primevue 4 的组件样式由主题 preset 驱动（CSS-in-JS 运行时注入），
// 必须 app.use(PrimeVue, { theme }) 才能激活，模块级单例安装一次即可
// darkModeSelector 默认 'system' 会跟随系统暗色模式，固定 'none' 保持浅色与其它表格一致
let installed = false;
function ensurePrimeVue() {
  if (installed) return;
  installed = true;
  getCurrentInstance().appContext.app.use(PrimeVue, {
    theme: {
      preset: Aura,
      options: { darkModeSelector: 'none' },
    },
  });
}
ensurePrimeVue();
</script>

<style>
.p-datatable .p-datatable-thead > tr > th,
.p-datatable .p-datatable-tbody > tr > td {
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  white-space: nowrap;
}
</style>
