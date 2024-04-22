import App from './App.svelte';
const app = new App({
  target: document.querySelector('#svelte-app'),
  props: {
    name: 'Svelte',
  },
});
export default app;
