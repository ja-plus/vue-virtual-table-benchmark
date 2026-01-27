<template>
  <div>
    <h2>AgGrid Vue</h2>
    <div style="height: 600px; width: 100%">
      <AgGridVue
        row-key="id"
        style="width: 100%; height: 100%"
        :column-defs="columnDefs"
        :row-data="tableData"
        :default-col-def="defaultColDef"
        :animate-rows="true"
        :enable-cell-text-selection="true"
        :row-height="28"
        :header-height="28"
      ></AgGridVue>
    </div>
  </div>
</template>

<script setup>
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { AgGridVue } from 'ag-grid-vue3';
import { computed } from 'vue';
import { tableColumns, tableData } from '../stk-table/props.js';
ModuleRegistry.registerModules([AllCommunityModule]);
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const defaultColDef = {
  resizable: true,
  sortable: true,
  filter: true,
  minWidth: 100,
};

const columnDefs = computed(() =>
  tableColumns.map(it => ({
    field: it.dataIndex,
    headerName: it.title,
    width: it.width,
    pinned:
      it.fixed === 'left' ? 'left' : it.fixed === 'right' ? 'right' : undefined,
    headerClass: it.headerClassName,
    cellClass: it.className,
    textAlign: it.align,
    headerClass: it.headerAlign ? `text-${it.headerAlign}` : '',
  })),
);
</script>
