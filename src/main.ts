import './styles.css';
import { debug } from './config';
// Override console methods when debug is disabled
if (!debug) {
  console.log = () => {};
  console.debug = () => {};
}
import { createApp } from 'vue';
import App from './App.vue';
import { store } from './store/AnalysisStore';

async function main() {
  await store.init();
  createApp(App).mount('#app');
}

document.addEventListener('DOMContentLoaded', main);