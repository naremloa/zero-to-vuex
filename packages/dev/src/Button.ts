import Vue from 'vue';

export default Vue.extend({
  render(h) {
    return h(
      'button',
      {
        on: {
          click: () => { this.$emit('click'); },
        },
      },
      this.$slots.default,
    );
  },
});
