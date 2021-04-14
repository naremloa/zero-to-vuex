import {
  forEachValue,
} from '../utils';
import Module from './module';

export default class ModuleCollection {
  constructor(rawRootModule) {
    // 註冊根模塊 (Vuex.Store options)
    this.register([], rawRootModule, false);
  }

  get(path) {
    return path.reduce((module, key) => module.getChild(key), this.root);
  }

  getNamespace(path) {
    let module = this.root;
    return path.reduce((namespace, key) => {
      module = module.getChild(key);
      return namespace + (module.namespaced ? `${key}/` : '');
    }, '');
  }

  register(path, rawModule) {
    const newModule = new Module(rawModule);
    if (path.length === 0) {
      this.root = newModule;
    } else {
      // 拿掉路徑中的最後一個，即為其父模塊的路徑
      const parent = this.get(path.slice(0, -1));
      // 將新生成的子模塊加入其父模塊中
      parent.addChild(path[path.length - 1], newModule);
    }

    // 繼續註冊它下面的子模塊
    if (rawModule.modules) {
      forEachValue(rawModule.modules, (rawChildModule, key) => {
        this.register(path.concat(key), rawChildModule);
      });
    }
  }
}
