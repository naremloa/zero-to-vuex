import {
  assert,
  __DEV__,
  unifyObjectStyle,
  isPromise,
  partial,
  forEachValue,
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
/**
 * 註冊 mutation
 * 將 type 和及其對應的 handler 成對存儲至 _mutations 中，
 * 並對 handler 封裝一層：
 *   1. 綁定 this
 *   2. 先塞入一些參數
 */
function registerMutation(store, type, handler) {
  const entry = store._mutations[type] || (store._mutations[type] = []);
  entry.push((payload) => {
    handler.call(store, store.state, payload);
  });
}

/**
 * 註冊 action
 * 將 type 和及其對應的 handler 成對存儲至 _actions 中，
 * 並對 handler 封裝一層：
 *   1. 綁定 this
 *   2. 先塞入一些參數
 *   3. 對非 Promise 的 handler 包一層 Promise
 */
function registerAction(store, type, handler) {
  const entry = store._actions[type] || (store._actions[type] = []);
  entry.push((payload) => {
    let res = handler.call(store, {
      dispatch: store.dispatch,
      commit: store.commit,
      getters: store.getters,
      state: store.state,
      rootGetters: store.getters,
      rootState: store.state,
    }, payload);
    // 如果 handler 不是 Promise 就包成 Promise
    if (!isPromise(res)) {
      res = Promise.resolve(res);
    }
    return res;
  });
}

/**
 * 註冊 getter
 * 將 type 和及其對應的 rawGetter 成對存儲至 _wrappedGetters 中
 * 並對 rawGetter 封裝一層次：
 *   1. 塞入參數
 */
function registerGetter(store, type, rawGetter) {
  // getter 不允許註冊同名的
  if (store._wrappedGetters[type]) {
    if (__DEV__) {
      console.error(`[zero-to-vuex] duplicate getter key: ${type}`);
    }
    return;
  }
  store._wrappedGetters[type] = function wrappedGetter() {
    return rawGetter(
      store.state, // local state
      store.getters, // local getters
      store.state, // root state
      store.getters, // root getters
    );
  };
}

/**
 * 生成存儲 store 的實體(從 vue 生成) ，並將引用存儲在 _vm 中
 * state 和 getter 分別對應 Vue 實體的 data 和 computed
 */
function resetStoreVM(store, state) {
  store.getters = {};
  const wrappedGetters = store._wrappedGetters;
  const computed = {};
  forEachValue(wrappedGetters, (fn, key) => {
    // FIXME: 找出會造成內存洩漏的原因
    // FIXME: computed[key] = () => fn(store);
    // use computed to leverage its lazy-caching mechanism
    // direct inline function use will lead to closure preserving oldVm.
    // using partial to return function with only arguments preserved in closure environment.
    computed[key] = partial(fn, store);
    Object.defineProperty(store.getters, key, {
      get: () => store._vm[key],
      enumerable: true,
    });
  });
  // 使用 Vue 實體來存儲 state
  // 強制 silent 是防止有人寫一些 funcky global mixin
  const { silent } = Vue.config;
  Vue.config.silent = true;
  store._vm = new Vue({
    data: { $$state: state },
    computed,
  });
  Vue.config.silent = silent;
}

/**
 * 將使用者傳遞過來的 options 內容，一一掛載到對應的變數中
 */
function installStore(store, state, options) {
  const {
    mutations: mutationsOpt,
    actions: actionsOpt,
    getters: gettersOpt,
  } = options;

  // 遍歷 mutations 並一一註冊到 _mutations 上
  if (mutationsOpt) {
    forEachValue(
      mutationsOpt,
      (fn, key) => { registerMutation(store, key, fn); },
    );
  }

  // 遍歷 actions 並一一註冊到 _actions 上
  if (actionsOpt) {
    forEachValue(
      actionsOpt,
      (fn, key) => { registerAction(store, key, fn); },
    );
  }

  // 遍歷 getters 並一一註冊到 _wrappedGetters 上
  if (gettersOpt) {
    forEachValue(
      gettersOpt,
      (fn, key) => { registerGetter(store, key, fn); },
    );
  }
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
    // TODO: 暫存變數，存儲使用者傳遞過來的設置
    this._options = options;
    // 判斷當前是否有 commit 正在執行
    this._committing = false;
    // 存儲 mutations 的地方
    this._mutations = Object.create(null);
    // 存儲 actions 的地方
    this._actions = Object.create(null);
    // 存儲 getters 的地方
    this._wrappedGetters = Object.create(null);

    const {
      state: stateOpt,
    } = options;

    const store = this;
    const { commit, dispatch } = this;
    // 綁死 commit 的 this 在 store 根實例上
    this.commit = function boundCommit(type, payload, commitOptions) {
      return commit.call(store, type, payload, commitOptions);
    };
    this.dispatch = function boundDispatch(type, payload) {
      return dispatch.call(store, type, payload);
    };

    const state = (typeof stateOpt === 'function' ? stateOpt() : stateOpt) || {};

    // 註冊各部分內容 actions, getters, mutations 等
    installStore(this, state, options);

    // 生成 store 本體
    resetStoreVM(this, state);
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

  dispatch(_type, _payload) {
    /**
     * 支持兩種 dispatch 的提交風格
     * store.dispatch('incrementAsync', { amount: 10 })
     * store.dispatch({ type: 'incrementAsync', amount: 10 })
     */
    const {
      type,
      payload,
    } = unifyObjectStyle(_type, _payload);

    const entry = this._actions[type];
    if (!entry) {
      if (__DEV__) {
        console.error(`[vuex] unknown action type: ${type}`);
      }
      return undefined;
    }

    // NOTE: 返回值類型不一。如果有一個以上的 handler 會存成 Array 丟回去。
    // _actions 有對應的 type 時，至少會有 1 個 handler
    const result = entry.length > 1
      ? Promise.all(entry.map((handler) => handler(payload)))
      : entry[0](payload);

    return result;
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
