import Vue, { VNode } from 'vue';

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
  },
  render(h): VNode {
    return h(
      'div',
      [
        h(
          'div',
          [
            h(
              'button',
              {
                on: {
                  click: () => {
                    this.$store.commit('increment', 2);
                  },
                },
              },
              '增加',
            ),
            h(
              'button',
              {
                on: {
                  click: () => {
                    this.$store.commit('decrement', 2);
                  },
                },
              },
              '減少',
            ),
          ],
        ),
        `${this.count}`,
      ],
    );
  },
});

export default Component;
