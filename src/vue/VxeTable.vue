<template>
  <div>
    <h2>vxe-table</h2>
    <VxeTable
      border
      :data="tableData"
      :height="600"
      :virtual-y-config="{ enabled: true, gt: 0 }"
      :virtual-x-config="{ enabled: true, gt: 0 }"
      :row-config="{ height: 28, isHover: true }"
    >
      <VxeColumn
        v-for="column in tableColumns"
        :key="column.dataIndex"
        :field="column.dataIndex"
        :width="column.width"
        :title="column.title"
        :fixed="column.fixed"
      ></VxeColumn>
    </VxeTable>
  </div>
</template>

<script setup>
import { tableColumns, tableData } from '../stk-table/props.js';
import { VxeTable, VxeColumn } from 'vxe-table';
import 'vxe-table/lib/style.css';
</script>
