import { LitElement, css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
export { MyLitPanel } from './Panel';

@customElement('my-lit-element')
export class MyLitElement extends LitElement {
  @property()
  accessor version = 'STARTING';

  @property()
  accessor list = [{ text: 1 }, { text: 2 }, { text: 3 }];

  @query('#uul')
  ul!: HTMLUListElement;

  static styles = css`
    .btn {
      border-radius: 5px;
      background-color: orange;
      color: #fff;
      border: none;
      height: 30px;
    }
  `;

  render() {
    return html`
      <p>Welcome to the Lit tutorial!</p>
      <p>This is the ${this.version} code.</p>
      <button class="btn" @click=${this.handleBtnClick}>count:${this.list.length}</button>
      <ul id="uul">
        ${this.list.map(it => html`<li>${it.text}</li>`)}
      </ul>
    `;
  }

  handleBtnClick(e: MouseEvent) {
    console.log('count button click', e, this.ul);
    this.list = [
      ...this.list,
      {
        text: this.list.length + 1,
      },
    ];
  }
}
