import React from 'react';
class Child extends React.Component {
  constructor(props) {
    super(props);
  }
  /** like computed */
  get doubleNum() {
    return this.props.num * 2;
  }
  render() {
    return (
      <div>
        <h2>Child Component</h2>
        <div>
          num: {this.props.num}, doubleNum: {this.doubleNum}
        </div>
        <input type="text" value={this.props.num} onChange={this.handleInputChange.bind(this)} />
      </div>
    );
  }
  handleInputChange(e) {
    this.props.changeNum(e.target.value);
  }

  refFunc() {
    console.log('child ref func');
  }
}
export default class HelloMessage extends React.Component {
  constructor(props) {
    super(props);
    this.state = { date: new Date(), num: 0 };
    // this.refs.child.focus(); // like vue this.$refs
    this.childRef = React.createRef();
  }

  componentDidMount() {
    console.log('component Mount');
  }
  componentWillUnmount() {
    console.log('component will unmount');
  }
  render() {
    return (
      <div>
        <div>
          props.name: {this.props.name} {this.state.date.toLocaleDateString()}
        </div>
        <div>{this.props.defaultProp}</div>
        <button onClick={this.handleClick.bind(this)}>click{this.state.num}</button>

        <div>{this.list()}</div>
        <Child /* ref="child" */ ref={this.childRef} num={this.state.num} changeNum={this.handleChangeNum}></Child>
      </div>
    );
  }

  handleClick(e) {
    console.log('click button', e);
    // console.log('findDomNode', this.findDOMNode());
    // this.replaceState({ num: this.state.num++ });
    // this.refs.child.refFunc();
    this.childRef.current.refFunc(); // current?
    this.setState(state => {
      state.num++;
      return state;
    });
  }

  /** 这样写去除bind */
  handleChangeNum = val => {
    this.setState(state => {
      state.num = val;
      return state;
    });
  };

  list() {
    let els = [];
    for (let i = 0; i < 10; i++) {
      els.push(<span key={i}>{i},</span>);
    }
    return els;
  }
}
// HelloMessage 一定在声明后使用
HelloMessage.defaultProps = {
  defaultProp: 'defaultProp',
};
