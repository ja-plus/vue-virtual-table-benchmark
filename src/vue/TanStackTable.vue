<template>
  <div>
    <h2>TanStack Table Vue</h2>
    <div style="height: 600px; width: 100%; overflow: auto">
      <table style="width: 100%; border-collapse: collapse">
        <thead style="position: sticky; top: 0; z-index: 2">
          <tr
            v-for="headerGroup in table.getHeaderGroups()"
            :key="headerGroup.id"
          >
            <th
              v-for="header in headerGroup.headers"
              :key="header.id"
              :style="{
                width: header.getSize() + 'px',
                minWidth: header.getSize() + 'px',
                position: header.column.getIsPinned() ? 'sticky' : undefined,
                left:
                  header.column.getIsPinned() === 'left'
                    ? header.column.getStart('left') + 'px'
                    : undefined,
                right:
                  header.column.getIsPinned() === 'right'
                    ? header.column.getAfter('right') + 'px'
                    : undefined,
                background: header.column.getIsPinned() ? '#f5f5f5' : '#fafafa',
                zIndex: header.column.getIsPinned() ? 3 : undefined,
                border: '1px solid #e8e8e8',
                padding: '4px 8px',
                textAlign: 'left',
                fontWeight: 500,
                height: '28px',
              }"
            >
              <FlexRender
                v-if="!header.isPlaceholder"
                :render="header.column.columnDef.header"
                :props="header.getContext()"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in table.getRowModel().rows"
            :key="row.id"
            :style="{ height: '28px' }"
          >
            <td
              v-for="cell in row.getVisibleCells()"
              :key="cell.id"
              :style="{
                width: cell.column.getSize() + 'px',
                minWidth: cell.column.getSize() + 'px',
                position: cell.column.getIsPinned() ? 'sticky' : undefined,
                left:
                  cell.column.getIsPinned() === 'left'
                    ? cell.column.getStart('left') + 'px'
                    : undefined,
                right:
                  cell.column.getIsPinned() === 'right'
                    ? cell.column.getAfter('right') + 'px'
                    : undefined,
                background: cell.column.getIsPinned() ? '#fff' : undefined,
                zIndex: cell.column.getIsPinned() ? 1 : undefined,
                border: '1px solid #e8e8e8',
                padding: '4px 8px',
                textAlign: cell.column.columnDef.meta?.align || 'left',
              }"
            >
              <FlexRender
                :render="cell.column.columnDef.cell"
                :props="cell.getContext()"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import {
  useVueTable,
  FlexRender,
  getCoreRowModel,
  getSortedRowModel,
} from '@tanstack/vue-table';
import { tableColumns, tableData } from '../stk-table/props.js';

const data = computed(() => tableData);

const columns = computed(() =>
  tableColumns.map(it => ({
    accessorKey: it.dataIndex,
    header: it.title,
    size: it.width,
    enablePinning: !!it.fixed,
    meta: {
      align: it.align,
    },
    cell: info => info.getValue(),
  })),
);

const initialState = {
  columnPinning: {
    left: tableColumns
      .filter(it => it.fixed === 'left')
      .map(it => it.dataIndex),
    right: tableColumns
      .filter(it => it.fixed === 'right')
      .map(it => it.dataIndex),
  },
};

const table = useVueTable({
  get data() {
    return data.value;
  },
  get columns() {
    return columns.value;
  },
  state: initialState,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  enableColumnPinning: true,
});
</script>
