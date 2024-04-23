<template>
  <div>
    <NDataTable
      style="height: 600px"
      virtual-scroll
      :max-height="600"
      :columns="columns"
      :data="tableData"
    ></NDataTable>
  </div>
</template>

<script setup>
import { NDataTable } from 'naive-ui';
import { tableData, tableColumns } from '../stk-table/props.js';
import { computed } from 'vue';

const columns = computed(() =>
  tableColumns.map(it => ({
    key: it.dataIndex,
    title: it.dataIndex,
    width: it.width,
    fixed: it.fixed,
    align: it.align,
    titleAlign: it.headerAlign,
  })),
);
</script>
