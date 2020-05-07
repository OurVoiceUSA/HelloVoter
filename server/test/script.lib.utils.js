import { expect } from 'chai';
import { runDatabase, genkeys } from '../scripts/lib/utils';

var docker = {
  command: async (cmd) => {
    return {containerList:[]};
  }
};

var keypair = () => {
  return {public: "public", private: "private"};
};

var config = {
  pagecache_size: 0,
  heap_size_init: 0,
  heap_size_max: 0,
};

describe('Script Utils', function () {

  it('runDatabase launches container', async () => {
    let str = await runDatabase({docker, sandbox: true, config});
    expect(str).to.equal("run -d -v neo4j-hv-sandbox:/data -p 57687:7687 -p 57474:7474 -e NEO4J_AUTH=neo4j/hellovoter --name neo4j-hv-sandbox ourvoiceusa/neo4j-hv");
  });

  it('runDatabase launches container with args', async () => {
    let str = await runDatabase({docker, sandbox: false, config: {
      pagecache_size: 1,
      heap_size_init: 1,
      heap_size_max: 1,
    }});
    expect(str).to.equal("run -d -v neo4j-hv:/data -p 7687:7687 -p 7474:7474 -e NEO4J_AUTH=neo4j/hellovoter -e NEO4J_dbms_memory_pagecache_size=1 -e NEO4J_dbms_memory_heap_initial__size=1 -e NEO4J_dbms_memory_heap_max__size=1 --name neo4j-hv ourvoiceusa/neo4j-hv");
  });

  it('runDatabase skips launch', async () => {
    let str = await runDatabase({docker: {
      command: async (cmd) => {
        return {containerList:[{names:'neo4j-hv'}]};
      }
    }, sandbox: false, config});
    expect(str).to.equal("Using already running neo4j-hv container.");
  });

  it('runDatabase throws error', async () => {
    try {
      await runDatabase({docker: {command: () => {throw Error()}}, sandbox: true, config});
      expect(true).to.equal(false);
    } catch (e) {
      expect(true).to.equal(true);
    }
  });

  it('genkeys no need for keypair', async () => {
    let pair = genkeys({fs: {readFileSync: () => {}, writeFileSync: () => {}}, keypair});
    expect(pair.public).to.not.exist;
    expect(pair.private).to.not.exist;
  });

  it('genkeys creates keypair', async () => {
    let pair = genkeys({fs: {readFileSync: () => {throw Error()}, writeFileSync: () => {}}, keypair});
    expect(pair.public).to.equal("public");
    expect(pair.private).to.equal("private");
  });

});
