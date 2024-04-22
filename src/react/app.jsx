import React from 'react';
import ReactDom from 'react-dom';
// import AntdTest from './antd.jsx';
import HelloMessage from './component.jsx';
class App extends React.Component {
  render() {
    return (
      <details style={{ color: '#333' }} className="test test2" open>
        <summary>
          <h1>React</h1>
        </summary>
        <HelloMessage name="prop value" />
        {/* <AntdTest /> */}
      </details>
    );
  }
}
ReactDom.render(<App />, document.getElementById('react-app'));
