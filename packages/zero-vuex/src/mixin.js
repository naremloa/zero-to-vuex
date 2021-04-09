export default function mixin(Vue) {
  function vuexInit() {
    const options = this.$options;
    // 註冊在 Vue 根例的 $options 上
    if (options.store) this.$store = options.store;
    // 對實例底下的 component 要通過 $options.parent 才能找到 Vue 根實例
    else if (options.parent && options.parent.$store) this.$store = options.parent.$store;
  }
  Vue.mixin({ beforeCreate: vuexInit });
}
