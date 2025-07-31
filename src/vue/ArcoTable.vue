<template>
  <div>
    <h2>
      arco-design-vue
      <a
        href="https://arco.design/vue/component/table#virtual-list"
        target="_blank"
        >table</a
      >
    </h2>
    <ul>
      <li>fixed right 覆盖fixed left</li>
      <li>虚拟列表不支持固定列</li>
      <li>同antdv 要配置scroll x</li>
      <li>要配置可视区高度</li>
      <li>行高配置未找到</li>
      <li>不好用。宽度小时，滚动有问题。</li>
    </ul>

    <Table
      row-key="id"
      :columns="columns"
      :data="tableData"
      :pagination="false"
      :bordered="{ cell: true }"
      :virtual-list-props="{ height: 600 }"
      :scroll="{ x: 1000 }"
    ></Table>
  </div>
</template>
<script setup>
import Table from '@arco-design/web-vue/es/table/index.js';
import { computed } from 'vue';
import { tableColumns, tableData } from '../stk-table/props.js';

import '@arco-design/web-vue/es/table/style/index.js';

const columns = computed(() =>
  tableColumns.map(it => ({
    dataIndex: it.dataIndex,
    title: it.title,
    width: it.width,
    fixed: it.fixed,
    align: it.align,
    titleAlign: it.headerAlign,
  })),
);
</script>
