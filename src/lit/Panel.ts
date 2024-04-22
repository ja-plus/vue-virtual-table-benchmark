import { CSSResultGroup, LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('my-lit-panel')
export class MyLitPanel extends LitElement {
  static styles?: CSSResultGroup = css`
    header {
      background-color: #ccc;
      font-size: 14px;
      font-weight: bold;
      padding: 0 10px;
      border-top-left-radius: 5px;
      border-top-right-radius: 5px;
      height: 30px;
      line-height: 30px;
    }
    section {
      border: 1px solid #ccc;
      border-bottom-left-radius: 5px;
      border-bottom-right-radius: 5px;
    }
  `;

  @property()
  accessor panelTitle: string = '';

  render() {
    return html`
      <div>
        <header>${this.panelTitle}</header>
        <section>
          <slot></slot>
        </section>
      </div>
    `;
  }
}
