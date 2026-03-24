import { createApp } from 'vue';
import App from './App.vue';

export function initVueApp() {
  const app = createApp(App);
  app.mount('#vue-app');
}
