import { createApp } from 'vue';
import App from './App.vue';
import VxeTable from 'vxe-table';
import 'vxe-table/lib/style.css';

export function initVueApp() {
  createApp(App).use(VxeTable).mount('#vue-app');
}
