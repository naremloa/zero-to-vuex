import {
  assert,
  __DEV__,
  unifyObjectStyle,
  isPromise,
  partial,
  forEachValue,
} from './utils';
import applyMixin from './mixin';
import ModuleCollection from './module/module-collection';

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
function registerMutation(store, type, handler, local) {
  const entry = store._mutations[type] || (store._mutations[type] = []);
  entry.push((payload) => {
    handler.call(store, local.state, payload);
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
function registerAction(store, type, handler, local) {
  const entry = store._actions[type] || (store._actions[type] = []);
  entry.push((payload) => {
    let res = handler.call(store, {
      dispatch: local.dispatch,
      commit: local.commit,
      getters: local.getters,
      state: local.state,
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
function registerGetter(store, type, rawGetter, local) {
  // getter 不允許註冊同名的
  if (store._wrappedGetters[type]) {
    if (__DEV__) {
      console.error(`[zero-to-vuex] duplicate getter key: ${type}`);
    }
    return;
  }
  store._wrappedGetters[type] = function wrappedGetter() {
    return rawGetter(
      local.state, // local state
      local.getters, // local getters
      store.state, // root state
      store.getters, // root getters
    );
  };
}

function getNestedState(rootState, path) {
  return path.reduce((state, key) => state[key], rootState);
}

/**
 * 由於 store.getters 是同一層下進行存儲，在做 local getter 時，
 * 要根據 namespace 篩選出相關的 getter
 */
function makeLocalGetters(store, namespace) {
  if (!store._makeLocalGettersCache[namespace]) {
    const gettersProxy = {};
    const splitPos = namespace.length;
    Object.keys(store.getters).forEach((type) => {
      // skip if the target getter is not match this namespace
      if (type.slice(0, splitPos) !== namespace) return;

      // extract local getter type
      const localType = type.slice(splitPos);

      // Add a port to the getters proxy.
      // Define as getter property because
      // we do not want to evaluate the getters in this time.
      Object.defineProperty(gettersProxy, localType, {
        get: () => store.getters[type],
        enumerable: true,
      });
    });
    store._makeLocalGettersCache[namespace] = gettersProxy;
  }

  return store._makeLocalGettersCache[namespace];
}

/**
 * 針對 namespace 生成局部的 dispatch, commit, getters 和 state
 * 預設存在一個 root 的模塊（上下文）
 */
function makeLocalContext(store, namespace, path) {
  const noNamespace = (namespace === '');
  const local = {
    dispatch: noNamespace
      ? store.dispatch
      : (_type, _payload, _options) => {
        const args = unifyObjectStyle(_type, _payload, _options);
        const { payload, options } = args;
        let { type } = args;
        if (!options || !options.root) {
          type = namespace + type;
          if (__DEV__ && !store._actions[type]) {
            console.error(`[vuex] unknown local action type: ${args.type}, global type: ${type}`);
            return;
          }
        }
        store.dispatch(type, payload);
      },

    commit: noNamespace
      ? store.commit
      : (_type, _payload, _options) => {
        const args = unifyObjectStyle(_type, _payload, _options);
        const { payload, options } = args;
        let { type } = args;

        if (!options || !options.root) {
          type = namespace + type;
          if (__DEV__ && !store._mutations[type]) {
            console.error(`[vuex] unknown local mutation type: ${args.type}, global type: ${type}`);
            return;
          }
        }

        store.commit(type, payload, options);
      },
  };

  Object.defineProperties(local, {
    getters: {
      get: noNamespace
        ? () => store.getters
        : () => makeLocalGetters(store, namespace),
    },
    state: {
      get: () => getNestedState(store.state, path),
    },
  });
  return local;
}

/**
 * 生成存儲 store 的實體(從 vue 生成) ，並將引用存儲在 _vm 中
 * state 和 getter 分別對應 Vue 實體的 data 和 computed
 */
function resetStoreVM(store, state) {
  // 清除所有 getter
  store.getters = {};
  // 清除 local getter 的緩存
  store._makeLocalGettersCache = Object.create(null);
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
function installModule(store, rootState, path, module) {
  const isRoot = !path.length;
  const namespace = store._modules.getNamespace(path);

  // 在 _modulesNamespaceMap 中留下 namespace 紀錄
  if (module.namespaced) {
    if (store._modulesNamespaceMap[namespace] && __DEV__) {
      console.error(`[vuex] duplicate namespace ${namespace} for the namespaced module ${path.join('/')}`);
    }
    store._modulesNamespaceMap[namespace] = module;
  }

  // 動態註冊子模塊的 state 到原本的 rootState 上
  if (!isRoot) {
    const parentState = getNestedState(rootState, path.slice(0, -1));
    const moduleName = path[path.length - 1];
    store._withCommit(() => {
      if (__DEV__) {
        if (moduleName in parentState) {
          console.warn(
            `[vuex] state field "${moduleName}" was overridden by a module with the same name at "${path.join('.')}"`,
          );
        }
      }
      Vue.set(parentState, moduleName, module.state);
    });
  }

  const local = module.context = makeLocalContext(store, namespace, path);

  // 遍歷 mutations 並一一註冊到 _mutations 上
  module.forEachMutation((mutation, key) => {
    const namespacedType = namespace + key;
    registerMutation(store, namespacedType, mutation, local);
  });

  /**
   * 遍歷 actions 並一一註冊到 _actions 上
   * 支持在帶 namespace 的模塊註冊全域 action
   * {
   *   modules: {
   *     foo: {
   *       namespaced: true,
   *       actions: {
   *         someAction: {
   *           root: true,
   *           handler(namespacedContext, payload) { ... }
   *         }
   *       }
   *     }
   *   }
   * }
   */
  module.forEachAction((action, key) => {
    const type = action.root ? key : namespace + key;
    const handler = action.handler || action;
    registerAction(store, type, handler, local);
  });

  // 遍歷 getters 並一一註冊到 _wrappedGetters 上
  module.forEachGetter((getter, key) => {
    const namespacedType = namespace + key;
    registerGetter(store, namespacedType, getter, local);
  });

  // 遍歷子模塊，一一註冊 options 的相關內容
  module.forEachChild((child, key) => {
    installModule(store, rootState, path.concat(key), child);
  });
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
    // 存儲 actions 的地方
    this._actions = Object.create(null);
    // 存儲 getters 的地方
    this._wrappedGetters = Object.create(null);
    // 存儲根模塊的地方
    this._modules = new ModuleCollection(options);
    // namespace 的註冊紀錄，防止同路徑的模塊被加入
    this._modulesNamespaceMap = Object.create(null);
    // 對同一個 namespace 底下的 local getters 的緩存
    this._makeLocalGettersCache = Object.create(null);

    const store = this;
    const { commit, dispatch } = this;
    // 綁死 commit 的 this 在 store 根實例上
    this.commit = function boundCommit(type, payload, commitOptions) {
      return commit.call(store, type, payload, commitOptions);
    };
    this.dispatch = function boundDispatch(type, payload) {
      return dispatch.call(store, type, payload);
    };

    const { state } = this._modules.root;

    // 註冊各部分內容 actions, getters, mutations 等
    installModule(this, state, [], this._modules.root);

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
