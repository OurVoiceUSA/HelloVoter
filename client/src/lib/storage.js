// stubs for mocha execution

import fs from 'fs';
import os from 'os';

var file = os.tmpdir()+'/hvtest.json';

function readStorage() {
  let storage = {};
  try {
    storage = JSON.parse(fs.readFileSync(file));
  } catch (e) {}
  return storage;
}

function writeStorage(storage) {
  try {
    fs.writeFileSync(file, JSON.stringify(storage));
  } catch (e) {
    console.log(e);
  }
}

export async function get(key) {
  let storage = readStorage();
  return storage[key];
}

export async function set(key, val) {
  let storage = readStorage();
  storage[key] = val;
  writeStorage(storage);
}

export async function del(key) {
  let storage = readStorage();
  delete storage[key];
  writeStorage(storage);
}
