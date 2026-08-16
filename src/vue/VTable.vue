<script setup>
import { ListTable } from '@visactor/vtable';
import { tableColumns, tableData } from '../stk-table/props.js';
import { onMounted, useTemplateRef } from 'vue';

const tableRef = useTemplateRef('tableRef');

const columns = tableColumns.map(it => {
  return {
    field: it.dataIndex,
    title: it.title,
    width: it.width,
    fixed: it.fixed,
    align: it.align,
    titleAlign: it.headerAlign,
  };
});

onMounted(() => {
  new ListTable(tableRef.value, {
    records: tableData,
    columns,
    widthMode: 'standard',
    defaultRowHeight: 28,
    frozenColCount: 2,
    rightFrozenColCount: 2,
    // theme: {
    //   defaultStyle: { borderColor: '#e1e4e8', borderLineWidth: 1 },
    //   headerStyle: { borderColor: '#e1e4e8', borderLineWidth: 1 },
    //   bodyStyle: { borderColor: '#e1e4e8', borderLineWidth: 1 },
    // },
  });
});
</script>
<template>
  <h2>vTable</h2>
  <div ref="tableRef" style="height: 600px"></div>
</template>
