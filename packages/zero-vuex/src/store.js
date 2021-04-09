import {
  assert,
  __DEV__,
  unifyObjectStyle,
} from './utils';
import applyMixin from './mixin';

let Vue;

// Vue 插件安裝
export function install(_Vue) {
  if (Vue && Vue === _Vue) {
    console.error('is already installed');
    return;
  }
  Vue = _Vue;
  applyMixin(Vue);
}

function registerMutation(store, type, handler) {
  const entry = store._mutations[type] || (store._mutations[type] = []);
  entry.push((payload) => {
    handler.call(store, store.state, payload);
  });
}

function resetStoreVM(store, state) {
  // 使用 Vue 實例來存儲 state
  // 強制 silent 是防止有人寫一些 funcky global mixin
  const { silent } = Vue.config;
  Vue.config.silent = true;
  store._vm = new Vue({
    data: { $$state: state },
  });
  Vue.config.silent = silent;
}

export class Store {
  constructor(options = {}) {
    /**
     * 必要的檢查
     * 1. 必須要先執行 Vue.use(Vuex) 安裝插件，要通過 mixin 注入到組件內部
     * 2. 必須要支持 Promise 非同步的 action 需要通過 Promise 處理
     * 3. 生成的實例必須要通過 new 產生，保證 constructor 內的流程有執行完
     */
    if (__DEV__) {
      assert(Vue, 'must call Vue.use(Vuex) before creating a store instance.');
      assert(typeof Promise !== 'undefined', 'vuex requires a Promise polyfill in this browser.');
      assert(this instanceof Store, 'store must be called with the new operator.');
    }

    // 內部變數
    // 判斷當前是否有 commit 正在執行
    this._committing = false;
    // 存儲 mutations 的地方
    this._mutations = Object.create(null);

    const {
      state: stateOpt,
      mutations: mutationsOpt,
    } = options;

    const store = this;

    // 遍歷 mutations 並一一註冊到 _mutations 上
    Object.keys(mutationsOpt).forEach((key) => {
      const mutation = mutationsOpt[key];
      registerMutation(store, key, mutation);
    });

    // 註冊 state
    const state = (typeof stateOpt === 'function' ? stateOpt() : stateOpt) || {};
    resetStoreVM(this, state);

    const { commit } = this;
    // 綁死 commit 的 this 在 store 根實例上
    this.commit = function boundCommit(type, payload, commitOptions) {
      return commit.call(store, type, payload, commitOptions);
    };
  }

  // state 存在實例化的 Vue 的 data 裡
  get state() {
    return this._vm._data.$$state;
  }

  // 阻擋直接修改 state 動作
  set state(v) {
    if (__DEV__) {
      assert(false, 'use store.replaceState() to explicit replace store state.');
    }
  }

  commit(_type, _payload, _options) {
    /**
     * 支持兩種 commit 的提交風格
     * store.commit('increment', { amount: 10 })
     * store.commit({ type: 'increment', amount: 10 })
     */
    const {
      type,
      payload,
      // options,
    } = unifyObjectStyle(_type, _payload, _options);

    // const mutation = { type, payload };
    const entry = this._mutations[type];
    // 找不到對應 mutation 時，進行報錯處理
    if (!entry) {
      if (__DEV__) {
        console.error(`[vuex] unknown mutation type: ${type}`);
      }
      return;
    }
    this._withCommit(() => {
      entry.forEach((handler) => {
        handler(payload);
      });
    });
  }

  // 直接替換 store 的根狀態，但還是要走 commit 的通道，防止報錯
  replaceState(state) {
    this._withCommit(() => {
      this._vm._data.$$state = state;
    });
  }

  /**
   * 紀錄 state 的變化是由 commit 引起的
   * 由於規則上明確了 commit 為同步過程，所以雖然引入了會有副作用的 this._committing 但依舊能保證 committing 的前後順序不會混亂
   */
  _withCommit(fn) {
    const committing = this._committing;
    this._committing = true;
    fn();
    this._committing = committing;
  }
}
