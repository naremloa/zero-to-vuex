export const __DEV__ = true;

export function assert(condition, msg) {
  if (!condition) throw new Error(`[zero-to-vuex] ${msg}`);
}

export function isObject(obj) {
  return obj !== null && typeof obj === 'object';
}

export function unifyObjectStyle(type, payload, options) {
  if (isObject(type) && type.type) {
    options = payload;
    payload = type;
    type = type.type;
  }

  if (__DEV__) {
    assert(typeof type === 'string', `expects string as the type, but found ${typeof type}.`);
  }

  return { type, payload, options };
}
