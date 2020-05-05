import { expect } from 'chai';

import { hv_config } from './hv_config';
import neo4j from './neo4j';
import queue from './queue';

var db, qq;

describe('Queue Tasks', function () {

  before(() => {
    db = new neo4j(hv_config);
    qq = new queue(db);
  });

  after(async () => {
    db.close();
  });

  it('doTask invalid queue id', async () => {
    let err = await qq.doTask('foobar');
    expect(err).to.equal(true);
  });

  it('checkQueue picks up no tasks', async () => {
    let ret = await qq.checkQueue();
    expect(ret).to.equal(false);
  });

  it('handle error task', async () => {
    await db.query(`create (qt:QueueTask {id: randomUUID(), created: timestamp(), task: {task}, input: {input}, active: false})`, {task: 'errop', input: JSON.stringify({})});
    let ret = await qq.checkQueue();
    expect(ret).to.equal(true);
  });

  it('checkQueue picks up queued tasks', async () => {
    await db.query(`create (qt:QueueTask {id: randomUUID(), created: timestamp(), task: {task}, input: {input}, active: false})`, {task: 'noop', input: JSON.stringify({})});
    let ret = await qq.checkQueue();
    expect(ret).to.equal(true);
  });

});
