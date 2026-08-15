<template>
  <div>
    <h2>stk table vue</h2>
    <StkTable
      row-key="id"
      style="height: 600px"
      virtual
      virtual-x
      scrollbar
      fixed-col-shadow
      :columns="tableColumns"
      :data-source="tableData"
    ></StkTable>
  </div>
</template>

<script setup>
import { StkTable } from 'stk-table-vue';
import { tableColumns, tableData } from '../stk-table/props.js';
import 'stk-table-vue/lib/style.css';
</script>
