import Vue from 'vue';
import zeroVuex from '@zero-to-vuex/zero-vuex';

Vue.use(zeroVuex);

export default new zeroVuex.Store({
  state: {
    count: 0,
  },
  getters: {
    formatCount: (state) => `NT$ ${state.count}`,
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
  actions: {
    async incrementAsync({ commit }, payload) {
      await new Promise((res) => { setTimeout(() => { res(null); }, 2000); });
      commit('increment', payload);
    },
  },
});
