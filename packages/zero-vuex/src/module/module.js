import { forEachValue } from '../utils';

// store 模塊的基礎資料結構
export default class Module {
  constructor(rawModule) {
    // 存儲其子模塊
    this._children = Object.create(null);
    // 存儲從使用者傳遞過來的 options
    this._rawModule = rawModule;
    const rawState = rawModule.state;

    // 存儲從使用者傳遞過來的 options 的 state
    this.state = (typeof rawState === 'function' ? rawState() : rawState) || {};
  }

  get namespaced() {
    return !!this._rawModule.namespaced;
  }

  // 動態新增子模塊
  addChild(key, module) {
    this._children[key] = module;
  }

  // 動態刪除子模塊
  removeChild(key) {
    delete this._children[key];
  }

  // 獲取子模塊
  getChild(key) {
    return this._children[key];
  }

  // 確認是否有子模塊
  hasChild(key) {
    return key in this._children;
  }

  // 動態更新模塊的 options
  update(rawModule) {
    this._rawModule.namespaced = rawModule.namespaced;
    if (rawModule.actions) {
      this._rawModule.actions = rawModule.actions;
    }
    if (rawModule.mutations) {
      this._rawModule.mutations = rawModule.mutations;
    }
    if (rawModule.getters) {
      this._rawModule.getters = rawModule.getters;
    }
  }

  forEachChild(fn) {
    forEachValue(this._children, fn);
  }

  forEachGetter(fn) {
    if (this._rawModule.getters) {
      forEachValue(this._rawModule.getters, fn);
    }
  }

  forEachAction(fn) {
    if (this._rawModule.actions) {
      forEachValue(this._rawModule.actions, fn);
    }
  }

  forEachMutation(fn) {
    if (this._rawModule.mutations) {
      forEachValue(this._rawModule.mutations, fn);
    }
  }
}
