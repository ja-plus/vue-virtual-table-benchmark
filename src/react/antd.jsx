import React from 'react';
import { Button } from 'antd';
import 'antd/dist/antd.css';
class ButtonTest extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <details>
        <summary>Buttons</summary>
        <Button type="primary">Primary Button</Button>
        <Button>Default Button</Button>
        <Button type="dashed">Dashed Button</Button>
        <br />
        <Button type="text">Text Button</Button>
        <Button type="link">Link Button</Button>
      </details>
    );
  }
}

export default class AntdTest extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <details>
        <summary>Ant-design</summary>
        <ButtonTest></ButtonTest>
      </details>
    );
  }
}
