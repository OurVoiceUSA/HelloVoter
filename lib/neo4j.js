
import neo4j from 'neo4j-driver';
import BoltAdapter from 'node-neo4j-bolt-adapter';

import { ov_config } from './ov_config.js';

// async'ify neo4j
const authToken = neo4j.auth.basic(ov_config.neo4j_user, ov_config.neo4j_pass);
const db = new BoltAdapter(neo4j.driver('bolt://'+ov_config.neo4j_host, authToken));

async function dbwrap() {
    var params = Array.prototype.slice.call(arguments);
    var func = params.shift();
    if (ov_config.DEBUG) {
      let funcName = func.replace('Async', '');
      console.log('DEBUG: '+funcName+' '+params[0]+';');
      if (params[1]) {
        let str = "";
        str += JSON.stringify(params[1]);
        console.log('DEBUG: :params '+str.substring(0, 1024));
      }
    }
    return db[func](params[0], params[1]);
}

export async function cqa(q, p) {
  return dbwrap('cypherQueryAsync', q, p);
}

export async function neo4j_version() {
  return ((await cqa('call apoc.monitor.kernel() yield kernelVersion return split(split(kernelVersion, ",")[1], " ")[2]'))).data[0];
}

export async function neo4j_db_size() {
  return (await cqa('CALL apoc.monitor.store() YIELD totalStoreSize return totalStoreSize')).data[0];
}

