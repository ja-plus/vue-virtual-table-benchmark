<script setup>
import { defineAsyncComponent, shallowRef } from 'vue';

// 每个表格一个 tab，通过 defineAsyncComponent 动态导入，切换时才加载对应 chunk
const tabs = [
  {
    key: 'stk-table',
    label: 'stk-table-vue',
    comp: defineAsyncComponent(() => import('./StkTable.vue')),
  },
  {
    key: 'vxe-table',
    label: 'vxe-table',
    comp: defineAsyncComponent(() => import('./VxeTable.vue')),
  },
  {
    key: 'naive-table',
    label: 'naive-ui',
    comp: defineAsyncComponent(() => import('./NaiveTable.vue')),
  },
  {
    key: 'element-table',
    label: 'element-plus',
    comp: defineAsyncComponent(() => import('./ElementTable.vue')),
  },
  {
    key: 'arco-table',
    label: 'arco-design',
    comp: defineAsyncComponent(() => import('./ArcoTable.vue')),
  },
  {
    key: 'tdesign-table',
    label: 'tdesign',
    comp: defineAsyncComponent(() => import('./TDesignTable.vue')),
  },
  {
    key: 'antdv-table',
    label: 'ant-design-vue(surely-vue)',
    comp: defineAsyncComponent(() => import('./AntdvTable.vue')),
  },
  {
    key: 'vuetify-table',
    label: 'vuetify',
    comp: defineAsyncComponent(() => import('./VuetifyTable.vue')),
  },
  {
    key: 'primevue-table',
    label: 'primevue',
    comp: defineAsyncComponent(() => import('./PrimeVueTable.vue')),
  },
  {
    key: 'vtable',
    label: 'v-table',
    comp: defineAsyncComponent(() => import('./VTable.vue')),
  },
  {
    key: 'ag-grid',
    label: 'ag-grid',
    comp: defineAsyncComponent(() => import('./AgGrid.vue')),
  },
  {
    key: 'tanstack-virtual',
    label: 'tanstack-virtual',
    comp: defineAsyncComponent(() => import('./TanStackVirtualTable.vue')),
  },
  // 注：vue-virtual-scroller / virtua / vueuc(VirtualList) 为通用虚拟列表组件，
  // 不属于表格组件，不加入排名；实现代码保留在 VirtualScrollerTable / VirtuaTable / VueucVirtualList.vue
];

const activeTab = shallowRef(tabs[0]);
</script>

<template>
  <div>
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: tab === activeTab }"
        @click="activeTab = tab"
      >
        {{ tab.label }}
      </button>
    </div>

    <component
      :is="activeTab.comp"
      :key="'panel-' + activeTab.key"
      class="tab-panel"
    ></component>
  </div>
</template>

<style scoped>
.tab-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 12px;
  border-bottom: 1px solid #e8e8e8;
}

.tab-btn {
  padding: 4px 12px;
  border: 1px solid #d9d9d9;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  background: #fafafa;
  cursor: pointer;
}

.tab-btn.active {
  background: #fff;
  color: #1677ff;
  border-color: #e8e8e8;
  font-weight: bold;
}
</style>
