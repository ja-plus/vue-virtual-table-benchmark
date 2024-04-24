<template>
  <div>
    <h2>vxe-table</h2>
    <vxe-table
      id="id"
      border
      :data="tableData"
      :height="600"
      :scroll-y="{ enabled: true }"
      :scroll-x="{ enabled: true, gt: 0 }"
      :row-config="{ height: 28, isHover: true }"
    >
      <vxe-column
        v-for="column in tableColumns"
        :key="column.dataIndex"
        :field="column.dataIndex"
        :width="column.width"
        :title="column.title"
        :fixed="column.fixed"
      ></vxe-column>
    </vxe-table>
  </div>
</template>

<script setup>
import { tableColumns, tableData } from '../stk-table/props.js';
</script>
