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
      <li>行高配置未找到</li>
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
