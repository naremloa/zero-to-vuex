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
    'foo/count': function (): number {
      return this.$store?.state?.foo?.count;
    },
    'foo/bar/count': function (): number {
      return this.$store?.state?.foo?.bar?.count;
    },
    formatCount(): string {
      return this.$store?.getters.formatCount;
    },
    'foo/formatCount': function (): string {
      return this.$store?.getters['foo/formatCount'];
    },
    'foo/bar/formatCount': function (): string {
      return this.$store?.getters['foo/bar/formatCount'];
    },
  },
  render(h): VNode {
    const module = ['', 'foo/', 'bar/'];
    const origin: { path: string, nodes: VNode[] } = { path: '', nodes: [] };
    return h(
      'div',
      module.reduce((acc, moduleName) => {
        const { path, nodes } = acc;
        const newPath = `${path}${moduleName}`;
        const count = `${newPath}count` as unknown;
        const formatCount = `${newPath}formatCount` as unknown;
        const node = h('div', [
          h('div', [
            h(Button, { on: { click: () => { this.$store.commit(`${newPath}increment`, 2); } } }, '增加'),
            h(Button, { on: { click: () => { this.$store.commit(`${newPath}decrement`, 2); } } }, '減少'),
            h(Button, { on: { click: () => { console.log(`${newPath}incrementAsync`); this.$store.dispatch(`${newPath}incrementAsync`, 2); } } }, '過2秒後自增'),
          ]),
          [
            h('div', ['state: count: ', this[count]]),
            h('div', ['getter: formatCount:', this[formatCount]]),
          ],
        ]);
        nodes.push(node);
        return { path: newPath, nodes };
      }, origin).nodes,
    );
  },
});

export default Component;
