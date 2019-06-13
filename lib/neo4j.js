
import neo4j from 'neo4j-driver';
import BoltAdapter from 'node-neo4j-bolt-adapter';

export default class db {

  constructor(config) {
    this.config = config;

    // async'ify neo4j
    const authToken = neo4j.auth.basic(this.config.neo4j_user, this.config.neo4j_pass);
    this.db = new BoltAdapter(neo4j.driver('bolt://'+this.config.neo4j_host, authToken));
  }

  async dbwrap() {
      var params = Array.prototype.slice.call(arguments);
      var func = params.shift();
      if (this.config.DEBUG) {
        let funcName = func.replace('Async', '');
        console.log('DEBUG: '+funcName+' '+params[0]+';');
        if (params[1]) {
          let str = "";
          str += JSON.stringify(params[1]);
          console.log('DEBUG: :params '+str.substring(0, 1024));
        }
      }
      return this.db[func](params[0], params[1]);
  }

  async query(q, p) {
    return this.dbwrap('cypherQueryAsync', q, p);
  }

  close() {
    this.db.close();
  }

  async version() {
    return ((await this.query('call apoc.monitor.kernel() yield kernelVersion return split(split(kernelVersion, ",")[1], " ")[2]'))).data[0];
  }

  async size() {
    return (this.query('CALL apoc.monitor.store() YIELD totalStoreSize return totalStoreSize')).data[0];
  }

}
