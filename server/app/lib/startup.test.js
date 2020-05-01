import EventEmitter from 'events';
import { expect } from 'chai';
import _ from 'lodash';

import { doDbInit, doJmxInit } from './startup';
import { min_neo4j_version } from './utils';
import { hv_config } from './hv_config';

class MockJmx {
  constructor(db) {
    this.ee = new EventEmitter();
  }

  on(event,callback) {
    this.ee.on(event, callback);
  }

  connect() {
    this.ee.emit("connect");
  }

  disconnect() {
    this.ee.emit("disconnect");
  }

  getAttribute(a,b,c) {
    switch (b) {
      case 'TotalPhysicalMemorySize':
      return c({longValue: 2048});
      break;
      case 'AvailableProcessors':
      return c(6);
    }
    return c({getSync: () => {
      return {longValue: 1024};
    }});
  }
}

var jmx = {
  createClient: () => {
    return new MockJmx();
  },
}

function dbMockFactory({edition = 'community', size = 512}) {
  return {
    query: async (q) => {
      switch (q) {
        case 'call dbms.components() yield edition': return [edition];
      }
      return [0];
    },
    version: () => {
      return min_neo4j_version.toString();
    },
    size: () => {
      return size;
    }
  };
}

describe('Startup Tasks', function () {

  it('jmx enterprise edition reset job_concurrency without jmx', async () => {
    let c = await doJmxInit(dbMockFactory({edition: 'enterprise'}), {}, _.merge({}, hv_config, {job_concurrency: 6}));
    expect(c).to.equal(1);
  });

  it('jmx enterprise edition fix crazy job_concurrency', async () => {
    let c = await doJmxInit(dbMockFactory({edition: 'enterprise'}), jmx, _.merge({}, hv_config, {job_concurrency: 6}));
    expect(c).to.equal(2);
  });

  it('jmx enterprise edition', async () => {
    let c = await doJmxInit(dbMockFactory({edition: 'enterprise'}), jmx, _.merge({}, hv_config, {job_concurrency: 2}));
    expect(c).to.equal(2);
  });

  it('jmx community edition no increase to job_concurrency', async () => {
    let c = await doJmxInit(dbMockFactory({}), jmx, _.merge({}, hv_config, {job_concurrency: 2}));
    expect(c).to.equal(1);
  });

  it('doDbInit db error', async () => {
    let c = await doDbInit({query: () => {throw "error"}});
    expect(c).to.equal(false);
  });

  it('doDbInit bad neo4j version', async () => {
    let c = await doDbInit({query: () => {}, version: () => {return (min_neo4j_version-0.1).toString()}});
    expect(c).to.equal(false);
  });

  it('doDbInit mock success', async () => {
    let db = dbMockFactory({});
    await doJmxInit(db, jmx, hv_config);
    let c = await doDbInit(db);
    expect(c).to.equal(true);
  });

  it('doDbInit mock success large db', async () => {
    let db = dbMockFactory({size: 8192});
    await doJmxInit(db, jmx, hv_config);
    let c = await doDbInit(db);
    expect(c).to.equal(true);
  });

  // TODO: create indexes; 174

});
