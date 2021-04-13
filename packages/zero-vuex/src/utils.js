export const __DEV__ = true;

export function assert(condition, msg) {
  if (!condition) throw new Error(`[zero-to-vuex] ${msg}`);
}

export function isObject(obj) {
  return obj !== null && typeof obj === 'object';
}

export function isPromise(val) {
  return val && typeof val.then === 'function';
}

export function partial(fn, arg) {
  return () => fn(arg);
}

/**
 * forEach for object
 */
export function forEachValue(obj, fn) {
  Object.keys(obj).forEach((key) => fn(obj[key], key));
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
