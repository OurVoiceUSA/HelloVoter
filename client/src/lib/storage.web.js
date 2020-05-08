
export async function get(key) {
  return localStorage.getItem(key);
}

export async function set(key, val) {
  localStorage.setItem(key, val);
}

export async function del(key) {
  localStorage.removeItem(key);
}
