// App.JSX
import { render } from 'solid-js/web';
import { stkTableColumns, stkTableData } from '../stk-table/props.js';
import { StkTable } from './StkTable.jsx';
// const [count,setCount] = createSignal(0);

// setInterval(() => {
//   setCount(count() + 1);
// },1000)

function App() {
  return <>
    <h1>Solid App</h1>
    <StkTable style="height:600px" virtual columns={stkTableColumns} dataSource={stkTableData}></StkTable>
  </>;
}
// 组件声明也可以直接用箭头函数
/*
const App = ()=> (<div>Solid My App</div>);
*/

render(() => <App />, document.querySelector('#solid-app'));
