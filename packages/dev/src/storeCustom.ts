import Vue from 'vue';
import zeroVuex from '@zero-to-vuex/zero-vuex';

Vue.use(zeroVuex);

export default new zeroVuex.Store({
  state: {
    count: 0,
  },
  mutations: {
    increment(state, payload) {
      const num = typeof payload === 'number'
        ? payload : 1;
      state.count += num;
    },
    decrement(state, payload) {
      const num = typeof payload === 'number'
        ? payload : 1;
      state.count -= num;
    },
  },
});
