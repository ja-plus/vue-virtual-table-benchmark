<script>
  // import ChildComponent from './childComponent.svelte';
  import StkTable from './StkTable.svelte';
  import { stkTableColumns, stkTableData } from '../stk-table/props.js';
  // import Smui from './smui.svelte';
  // import 'carbon-components-svelte/css/white.css';
  // import { Button } from "carbon-components-svelte"; // 啥也不是
  // export let name = 'svelte';
  let num = 0;
  $: doubleNum = num * 2;
  $: {
    console.log('svelte:doubleNum', doubleNum);
  }
  let arr = [];
  function count() {
    num++;
    arr = arr.concat([num]); // 赋值才能更新引用类型
  }
</script>

<div open>
  <h1>Svelte4 App</h1>
  <!-- <ChildComponent>
    <header slot="header">{name}</header>
    <span>
      header: <input type="text" bind:value={name} />
      <button on:click={count}>num: {num},doubleNum: {doubleNum}</button>
      arr:{arr}
    </span>
  </ChildComponent>
  <ChildComponent color="#fff">
    <header slot="header">SMUI</header>
    <div>
    </div>
  </ChildComponent> -->
  <StkTable style="height:600px" columns={stkTableColumns} dataSource={stkTableData}></StkTable>
  <!-- <Button>carbon-components-svelte Button</Button> -->
</div>
