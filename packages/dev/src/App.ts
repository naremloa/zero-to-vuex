import Vue, { VNode } from 'vue';
import Button from './Button';

const Component = Vue.extend({
  data() {
    return {
      msg: 'Hello',
    };
  },
  methods: {
    // need annotation due to `this` in return type
    greet(): string {
      return `${this.msg} world`;
    },
  },
  computed: {
    // need annotation
    greeting(): string {
      return `${this.greet()}!`;
    },
    count(): number {
      return this.$store?.state?.count;
    },
    formatCount(): string {
      return this.$store?.getters.formatCount;
    },
  },
  render(h): VNode {
    return h(
      'div',
      [
        h(
          'div',
          [
            h(Button, { on: { click: () => { this.$store.commit('increment', 2); } } }, '增加'),
            h(Button, { on: { click: () => { this.$store.commit('decrement', 2); } } }, '減少'),
            h(Button, { on: { click: () => { this.$store.dispatch('incrementAsync', 2); } } }, '過2秒後自增'),
          ],
        ),
        [
          h('div', `state: ${this.count}`),
          h('div', `getters: ${this.formatCount}`),
        ],
      ],
    );
  },
});

export default Component;
