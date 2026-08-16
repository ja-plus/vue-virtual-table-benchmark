import { createApp } from 'vue';
import App from './App.vue';
import { defineCustomElements as defineRevoGridElements } from '@revolist/revogrid/loader';

// RevoGrid 为 Web Component，须在应用启动时全局注册一次，
// 避免在懒加载 tab chunk 内注册后被 HMR 热替换导致 revogr-* 构造函数失效。
defineRevoGridElements(window);

export function initVueApp() {
  const app = createApp(App);
  app.mount('#vue-app');
}
