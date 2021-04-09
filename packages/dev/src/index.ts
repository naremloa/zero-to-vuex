import Vue from 'vue';
import storeCustom from './storeCustom';
import App from './App';

console.log('check storeCustom', storeCustom);

const app = new Vue({
  store: storeCustom,
  render: (h) => h(App),
}).$mount('#app');

export default app;
