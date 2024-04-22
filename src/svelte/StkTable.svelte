<script>
  import { onMount } from 'svelte';
  import '../stk-table/stk-table.less';
  
  export let style = '';
  export let virtual = true;

  let tableContainer;

  let virtualScroll = {
    containerHeight: 0,
    startIndex: 0, // 数组开始位置
    rowHeight: 28,
    offsetTop: 0, // 表格定位上边距
    scrollTop: 0, // 纵向滚动条位置，用于判断是横向滚动还是纵向
  };
  export let columns = [
    { dataIndex: 'id', title: 'ID' },
    { dataIndex: 'name', title: 'Name' },
  ];

  export let dataSource = [];

  $: dataSourceCopy = [...dataSource];
  /** 数据量大于2页才开始虚拟滚动*/

  /** 虚拟滚动展示的行数 */
  $: virtual_pageSize = Math.ceil(virtualScroll.containerHeight / virtualScroll.rowHeight) + 1; // 这里最终+1，因为headless=true无头时，需要上下各预渲染一行。
  $: virtual_on = virtual && dataSourceCopy.length > virtual_pageSize * 2;

  /** 虚拟滚动展示的行 */
  $: virtual_dataSourcePart = virtual_on
    ? dataSourceCopy.slice(virtualScroll.startIndex, virtualScroll.startIndex + virtual_pageSize)
    : dataSourceCopy;
  /** 虚拟表格定位下边距*/
  $: virtual_offsetBottom = virtual_on ?(dataSourceCopy.length - virtualScroll.startIndex - virtual_dataSourcePart.length) * virtualScroll.rowHeight : 0;

  onMount(() => {
    initVirtualScroll();
  });

  /**
   * 初始化虚拟滚动参数
   * @param {number} [height] 虚拟滚动的高度
   */
  function initVirtualScroll(height) {
    initVirtualScrollY(height);
    // this.initVirtualScrollX();
  }
  /**
   * 初始化Y虚拟滚动参数
   * @param {number} [height] 虚拟滚动的高度
   */
  function initVirtualScrollY(height) {
    if(virtual_on){
      virtualScroll.containerHeight = typeof height === 'number' ? height : tableContainer?.offsetHeight;
      virtualScroll = virtualScroll;
      updateVirtualScrollY(tableContainer?.scrollTop);
    }
  }
  /** 通过滚动条位置，计算虚拟滚动的参数 */
  function updateVirtualScrollY(sTop = 0) {
    const { rowHeight } = virtualScroll;
    const startIndex = Math.floor(sTop / rowHeight);
    Object.assign(virtualScroll, {
      startIndex,
      offsetTop: startIndex * rowHeight, // startIndex之前的高度
    });
  }

  function onTableScroll(e) {
    if (!e?.target) return;

    // 此处可优化，因为访问e.target.scrollXX消耗性能
    const { scrollTop, scrollLeft } = e.target;
    // 纵向滚动有变化
    if (scrollTop !== virtualScroll.scrollTop) virtualScroll.scrollTop = scrollTop;
    if (virtual_on) {
      updateVirtualScrollY(scrollTop);
    }
  }
</script>

<div class="stk-table" bind:this={tableContainer} {style} on:scroll={onTableScroll}>
  <table class="stk-table-main">
    <thead>
      <tr>
        {#each columns as col (col.dataIndex)}
          <th data-col-key={col.dataIndex}>{col.title || '--'}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      <tr style="height: {`${virtualScroll.offsetTop}px`}"></tr>
      {#each virtual_dataSourcePart as row (row.id)}
        <tr>
          {#each columns as col (col.dataIndex)}
            <td>{row[col.dataIndex] || '--'}</td>
          {/each}
        </tr>
      {/each}
      <tr style="height: {`${virtual_offsetBottom}px`}"></tr>
    </tbody>
  </table>
</div>
