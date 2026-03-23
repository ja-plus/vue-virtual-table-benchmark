<template>
  <div>
    <h2>TanStack Table Vue (Virtual Scrolling)</h2>
    <div
      ref="tableContainer"
      style="height: 600px; width: 100%; overflow: auto"
      @scroll="handleScroll"
    >
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
          <!-- Top spacer -->
          <tr :style="{ height: virtualScroll.offsetTop + 'px' }"></tr>

          <!-- Visible rows -->
          <tr
            v-for="row in visibleRows"
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

          <!-- Bottom spacer -->
          <tr :style="{ height: virtualScroll.offsetBottom + 'px' }"></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import {
  useVueTable,
  FlexRender,
  getCoreRowModel,
  getSortedRowModel,
} from '@tanstack/vue-table';
import { tableColumns, tableData } from '../stk-table/props.js';

// Refs
const tableContainer = ref(null);

// Virtual scroll state
const virtualScroll = ref({
  containerHeight: 600,
  startIndex: 0,
  endIndex: 0,
  rowHeight: 28,
  offsetTop: 0,
  offsetBottom: 0,
  pageSize: 0,
});

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

// Computed visible rows
const visibleRows = computed(() => {
  const allRows = table.getRowModel().rows;
  return allRows.slice(
    virtualScroll.value.startIndex,
    virtualScroll.value.endIndex,
  );
});

// Initialize virtual scroll
const initVirtualScroll = () => {
  if (!tableContainer.value) return;

  const containerHeight = tableContainer.value.clientHeight;
  const pageSize =
    Math.ceil(containerHeight / virtualScroll.value.rowHeight) + 2; // +2 for buffer

  virtualScroll.value.containerHeight = containerHeight;
  virtualScroll.value.pageSize = pageSize;
  virtualScroll.value.endIndex = Math.min(pageSize, data.value.length);
  virtualScroll.value.offsetBottom =
    (data.value.length - virtualScroll.value.endIndex) *
    virtualScroll.value.rowHeight;
};

// Handle scroll event
const handleScroll = e => {
  if (!e.target) return;

  const scrollTop = e.target.scrollTop;
  const startIndex = Math.floor(scrollTop / virtualScroll.value.rowHeight);
  const endIndex = Math.min(
    startIndex + virtualScroll.value.pageSize,
    data.value.length,
  );

  virtualScroll.value.startIndex = startIndex;
  virtualScroll.value.endIndex = endIndex;
  virtualScroll.value.offsetTop = startIndex * virtualScroll.value.rowHeight;
  virtualScroll.value.offsetBottom =
    (data.value.length - endIndex) * virtualScroll.value.rowHeight;
};

// Watch for data changes
watch(data, () => {
  initVirtualScroll();
});

// Initialize on mount
onMounted(() => {
  // Wait for next tick to ensure DOM is ready
  setTimeout(() => {
    initVirtualScroll();
  }, 0);
});
</script>
