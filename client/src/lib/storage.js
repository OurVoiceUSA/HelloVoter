// stubs for mocha execution

var storage = {};

export async function get(key) {
  return storage[key];
}

export async function set(key, val) {
  storage[key] = val;
}

export async function del(key) {
  delete storage[key];
}
