import { For, createSignal, onMount } from "solid-js";
import '../stk-table/stk-table.less';

export function StkTable(props) {
    let tableContainer;
    const [virtualScroll, setVirtualScroll] = createSignal({
        containerHeight: 0,
        startIndex: 0, // 数组开始位置
        rowHeight: 28,
        offsetTop: 0, // 表格定位上边距
        scrollTop: 0, // 纵向滚动条位置，用于判断是横向滚动还是纵向
    });

    const [dataSourceCopy, setDataSourceCopy] = createSignal([]);

    const virtual_pageSize = () => {
        const vs = virtualScroll();
        return Math.ceil(vs.containerHeight / vs.rowHeight) + 1
    }; // 这里最终+1，因为headless=true无头时，需要上下各预渲染一行。
    const virtual_on = () => props.virtual && dataSourceCopy().length > virtual_pageSize() * 2;
    /** 虚拟滚动展示的行 */
    const virtual_dataSourcePart = () => {
        const vs = virtualScroll();
        const pageSize = virtual_pageSize();
        console.log(vs, pageSize)
        return virtual_on()
            ? dataSourceCopy().slice(vs.startIndex, vs.startIndex + pageSize)
            : dataSourceCopy()
    };
    /** 虚拟表格定位下边距*/
    const virtual_offsetBottom = () => virtual_on() ? (dataSourceCopy().length - virtualScroll().startIndex - virtual_dataSourcePart().length) * virtualScroll().rowHeight : 0;


    onMount(() => {
        setDataSourceCopy([...props.dataSource]);
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
        if (virtual_on()) {
            const vs = virtualScroll()
            vs.containerHeight = typeof height === 'number' ? height : tableContainer?.offsetHeight;
            setVirtualScroll(vs);
            updateVirtualScrollY(tableContainer?.scrollTop);
        }
    }
    /** 通过滚动条位置，计算虚拟滚动的参数 */
    function updateVirtualScrollY(sTop = 0) {
        let vs = virtualScroll();
        const startIndex = Math.floor(sTop / vs.rowHeight);
        Object.assign(vs, {
            startIndex,
            offsetTop: startIndex * vs.rowHeight, // startIndex之前的高度
        });
        setVirtualScroll({...vs});// 必须扩展运算，否则不触发更新
    }
    function onTableScroll(e) {
        if (!e?.target) return;

        // 此处可优化，因为访问e.target.scrollXX消耗性能
        const { scrollTop, scrollLeft } = e.target;
        const vs = virtualScroll()
        // 纵向滚动有变化
        if (scrollTop !== vs.scrollTop) {
            vs.scrollTop = scrollTop;
            setVirtualScroll(vs);
        }
        if (virtual_on()) {
            updateVirtualScrollY(scrollTop);
        }
    }

    return <div class="stk-table" ref={tableContainer} style={props.style} onScroll={onTableScroll}>
        <table class="stk-table-main">
            <thead>
                <tr>
                    <For each={props.columns}>{
                        (col) =>
                            <th data-col-key={col.dataIndex}>{col.title || '--'}</th>
                    }</For>
                </tr>
            </thead>
            <tbody>
                <tr style={{ height: `${virtualScroll().offsetTop}px` }}></tr>
                <For each={virtual_dataSourcePart()}>{
                    (row) =>
                        <tr>
                            <For each={props.columns}>{
                                (col) => <td>{row[col.dataIndex] || '--'}</td>
                            }</For>
                        </tr>
                }</For>
                <tr style={{ height: `${virtual_offsetBottom()}px` }}></tr>
            </tbody>
        </table>
    </div>
}