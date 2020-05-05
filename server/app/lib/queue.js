import EventEmitter from 'events';
import FormData from 'form-data';
import fetch from 'node-fetch';
import papa from 'papaparse';
import _ from 'lodash';

import { asyncForEach, sleep } from './utils';
import { hv_config } from './hv_config';
import { concurrency } from './startup';

export default class queue {

  constructor(db) {
    this.db = db;
    var queue = new EventEmitter();
    this.queue = queue;
    var tt = this;

    this.queue.on('doTask', async (id) => {
      await this.doTask(id);
    });
    this.queue.on('checkQueue', async () => {
      await this.checkQueue();
    });
  }

  async checkQueue() {
    let db = this.db;
    let queue = this.queue;
    let ran = false;

    console.log("Checking queue for tasks to run...");
    try {
      let ref = await db.query('match (a:QueueTask {active: true}) return count(a)');
      let running = ref[0];
      console.log("Number of running jobs: "+running);
      if (running >= concurrency) {
        console.log("Too many tasks running to start another.");
        return true;
      }

      let job = await db.query('match (a:QueueTask) where a.active = false and not exists(a.started) with a limit 1 set a.active = true, a.started = timestamp() return a');
      if (!job[0]) {
        console.log("No tasks in queue to execute.");
        return false;
      }

      queue.emit('doTask', job[0].id);
      ran = true;

      // wait a second, then check again if we have capacity to run more
      await sleep(1000);

      if ((running+1) < concurrency) queue.emit('checkQueue');

    } catch (e) {
      console.warn("Houston we have a problem.");
      console.warn(e);
      return;
    }

    return ran;
  }

  async doTask(id) {
    let db = this.db;
    let queue = this.queue;
    let tt = this;

    let task;
    let error = false;
    let start = new Date().getTime();

    try {
      let job = await db.query('match (a:QueueTask {id:{id}}) return a', {id});

      if (!job[0])
        throw new Error("QueueTask with id "+id+" does not exist.");

      task = job[0].task;
      console.log(task+"() started @ "+start);

      let ret = await tt[task](id, JSON.parse(job[0].input));

      // mark job as success
      await db.query('match (a:QueueTask {id:{id}}) set a.active = false, a.completed = timestamp(), a.success = true, a.error = null', {id});
    } catch (e) {
      console.warn("Caught exception while executing task: "+task);
      console.warn(e);
      // mark job as failed
      await db.query('match (a:QueueTask {id:{id}}) set a.active = false, a.completed = timestamp(), a.success = false, a.error = {error}', {
        id,
        error: e.toString(),
      });
      error = true;
    }

    let finish = new Date().getTime();
    console.log(task+"() finished @ "+finish+" after "+(finish-start)+" milliseconds");

    // if we encountered an error, wait a bit before we trigger another queue check
    if (error) {
      console.warn("Due to queue task error, waiting 10 seconds before triggering checkQueue again.");
      await sleep(10000);
    }

    // check to see if there's another job to execute
    queue.emit('checkQueue');

    return error;
  }

  async queueTask(task, pattern, input) {
    let job;

    // create QueueTask object in database -- either we can execute now (active: true, started: timestamp()) or we have to wait (active: false)
    try {
      let args = _.merge({}, input);
      args.input = JSON.stringify(input);
      args.task = task;

      job = await this.db.query('match (a:QueueTask {active: true}) with count(a) as jobs call apoc.do.when(jobs < '+concurrency+', "create (a:QueueTask {id: randomUUID(), created: timestamp(), started: timestamp(), task: task, input: input, active: true}) return a", "create (a:QueueTask {id: randomUUID(), created: timestamp(), task: task, input: input, active: false}) return a", {task: {task}, input: {input}}) yield value match (a:QueueTask {id:value.a.id}) match (b:'+pattern+') merge (b)-[:PROCESSED_BY]->(a) return a', args);
    } catch (e) {
      console.warn("Houston we have a problem.");
      console.warn(e);
      return;
    }

    // find out whether we execute or enqueue
    if (process.env['TEST_EXEC']) {
      await this.doTask(job[0].id);
    } else if (job[0].active) {
      this.queue.emit('doTask', job[0].id);
    } else {
      console.log("Enqueued task "+task);
    }

    return job[0];
  }

  async clearQueue(msg) {
    // when clearing the queue, assume any "active" tasks are dead, and mark them as failed
    await this.db.query('match (a:QueueTask {active: true}) set a.active = false, a.completed = timestamp(), a.success = false, a.error = {msg}', {msg: msg});
    this.queue.emit('checkQueue');
  }

  async noop() {
    console.log("Smooth Operator...");
  }

  async errop() {
    throw Error("You've been hit by, you've been struck by, a smooth criminal!");
  }

  async doAddAddress(jobId, input) {
    let start = new Date().getTime();
    await this.db.query('match (a:ReferenceNode {name:"spatial_root"}) with collect(a) as lock call apoc.lock.nodes(lock) match (a:Address {id:{addressId}}) call spatial.addNode("address", a) yield node call spatial.intersects("turf", a.position) yield node as turf merge (a)-[:WITHIN]->(turf) return turf', input);
    console.log("Processed new address at "+input.longitude+","+input.latitude+" in "+((new Date().getTime())-start)+" milliseconds");
  }

  async doTurfIndexing(jobId, input) {
    let start = new Date().getTime();

    let ref = await this.db.query('CALL apoc.periodic.iterate("match (a:Turf {id:\\"'+input.turfId+'\\"}) call spatial.intersects(\\"address\\", a.wkt) yield node return node, a", "merge (node)-[:WITHIN]->(a)", {batchSize:1000,iterateList:true}) yield total return total', input);
    let total = ref[0];
    console.log("Processed "+total+" records for "+input.turfId+" in "+((new Date().getTime())-start)+" milliseconds");

    return {total: total};
  }

  async doProcessImport(jobId, input) {
    // TODO: status update to queue after each db query
    let filename = input.filename;
    let stats;

    // if no pid, create with randomUUID(), unless there are no attributes
    await this.db.query('match (if:ImportFile {filename:{filename}}) where length(if.attributes) = 0 match (if)<-[:FILE]-(ir:ImportRecord) set ir.pid = null', {filename: filename});
    await this.db.query('match (if:ImportFile {filename:{filename}}) where length(if.attributes) > 0 match (if)<-[:FILE]-(ir:ImportRecord) where ir.pid = "" set ir.pid = randomUUID()', {filename: filename});

    // parse_start
    await this.db.query('match (a:ImportFile {filename:{filename}}) set a.parse_start = timestamp()', {filename: filename});

    let limit = 1000;

    // non-unit addresses
    await this.db.query(`match (a:ImportFile {filename:{filename}})
      CALL apoc.periodic.iterate("match (a:ImportFile {filename:\\""+a.filename+"\\"})<-[:FILE]-(b:ImportRecord) where b.unit = '' return b",
        "merge (c:Address {id:apoc.util.md5([toLower(b.street), toLower(b.city), toLower(b.state), substring(b.zip,0,5)])})
          on create set c += {created: timestamp(), updated: timestamp(), position: point({longitude: toFloat(b.lng), latitude: toFloat(b.lat)}), street:b.street, city:b.city, state:b.state, zip:b.zip}
        merge (c)-[:SOURCE]->(b)
        set c :Residence
        with b,c
        merge (d:Person {id:b.pid})
        merge (d)-[:SOURCE]->(b)
        merge (d)-[:RESIDENCE {current:true}]->(c)",
      {batchSize:{limit},iterateList:true}) yield total return total
    `, {filename: filename, limit: limit});

    // multi-unit addresses
    await this.db.query(`match (a:ImportFile {filename:{filename}})
      CALL apoc.periodic.iterate("match (a:ImportFile {filename:\\""+a.filename+"\\"})<-[:FILE]-(b:ImportRecord) where not b.unit = '' return b",
        "merge (c:Address {id:apoc.util.md5([toLower(b.street), toLower(b.city), toLower(b.state), substring(b.zip,0,5)])})
          on create set c += {created: timestamp(), updated: timestamp(), position: point({longitude: toFloat(b.lng), latitude: toFloat(b.lat)}), street:b.street, city:b.city, state:b.state, zip:b.zip}
        merge (e:Unit {name:b.unit})-[:AT]->(c)
        merge (c)-[:SOURCE]->(b)
        merge (e)-[:SOURCE]->(b)
        set c :Residence
        set e :Residence
        with b,e
        merge (d:Person {id:b.pid})
        merge (d)-[:SOURCE]->(b)
        merge (d)-[:RESIDENCE {current:true}]->(e)",
      {batchSize:{limit},iterateList:true}) yield total return total
      `, {filename: filename, limit: limit});

    // loop through attributes and create them per person

    let aref = await this.db.query('match (a:ImportFile {filename:{filename}}) with a.attributes as attrs unwind attrs as attr match (a:Attribute {name:attr}) return a.id', {filename: filename});

    await asyncForEach(aref, async (id) => {
      await this.db.query('match (if:ImportFile {filename:{filename}}) match (a:Attribute {id:{aId}}) CALL apoc.periodic.iterate("match (a:Person)-[:SOURCE]->(b:ImportRecord)-[:FILE]->(c:ImportFile {filename:\\""+if.filename+"\\"})-[:ATTRIBUTES]->(d:Attribute {id:\\""+a.id+"\\"}) return a,b,c,d", "create (e:PersonAttribute {value:b[d.name]})-[:ATTRIBUTE_OF {current:true, updated: timestamp()}]->(a) create (e)-[:COLLECTED_ON]->(c) create (e)-[:ATTRIBUTE_TYPE]->(d)", {batchSize:{limit},iterateList:true}) yield total return total', {filename: filename, limit: limit, aId: id});
    });

    // loop through attributes with multi:false and remove {current:true} property on older sources

    // parse_end + num_*, geocode_start
    stats = await this.db.query('match (a:ImportFile {filename:{filename}})<-[:FILE]-(b:ImportRecord)<-[:SOURCE]-(c:Address) with a, count(distinct(b)) as num_records, count(distinct(c)) as num_addresses match (a)<-[:FILE]-(b:ImportRecord)<-[:SOURCE]-(d:Person) return num_records, num_addresses, count(distinct(d)) as num_people', {filename: filename});
    let num_addresses = stats[0][1]; // save for below
    await this.db.query('match (a:ImportFile {filename:{filename}}) set a.parse_end = timestamp(), a.geocode_start = timestamp(), a.num_records = toInt({num_records}), a.num_addresses = toInt({num_addresses}), a.num_people = toInt({num_people})', {filename: filename, num_records: stats[0][0], num_addresses: stats[0][1], num_people: stats[0][2]});

    // geocoding
    // census has a limit of 10k per batch
    limit = 10000;
    let count = limit;

    if (hv_config.enable_geocode) {
      while (count === limit) {
        let ref = await this.db.query('match (:ImportFile {filename:{filename}})<-[:FILE]-(:ImportRecord)<-[:SOURCE]-(a:Address) where a.position is null return distinct(a) limit {limit}', {filename: filename, limit: limit});
        count = ref.length;
        if (count) await doGeocode(this.db, ref);
      }
    }

    // geocode_end, geocode_success/fail, dedupe_start
    stats = await this.db.query('match (:ImportFile {filename:{filename}})<-[:FILE]-(:ImportRecord)<-[:SOURCE]-(a:Address) where a.position = point({longitude: 0, latitude: 0}) return count(a)', {filename: filename});
    await this.db.query('match (a:ImportFile {filename:{filename}}) set a.geocode_end = timestamp(), a.geocode_success = toInt({geocode_success}), a.goecode_fail = toInt({goecode_fail}), a.dedupe_start = timestamp()', {filename: filename, geocode_success: (num_addresses-stats[0]), goecode_fail: stats[0]});

    // find instances of duplicate Address(id) and merge them into a single node
    // TODO: we only merge :Address here - can still have dupe Unit & Person nodes
    stats = await this.db.query('match (a:ImportFile {filename: {filename}}) call apoc.periodic.iterate("match (aa:Address)-[:SOURCE]->(:ImportRecord)-[:FILE]->(:ImportFile {filename:\\""+a.filename+"\\"}) with distinct(aa) as a return a", "match (b:Address {id:a.id}) with a, count(b) as count where count > 1 match (aa:Address {id:{a.id}}) with collect(aa) as nodes call apoc.refactor.mergeNodes(nodes) yield node return node", {batchSize:100,iterateList:false}) yield total return total', {filename: filename});

    // dedupe_end, dupes, turfadd_start
    await this.db.query('match (a:ImportFile {filename:{filename}}) set a.dedupe_end = timestamp(), a.dupes_address = toInt({dupes_address}), a.turfadd_start = timestamp()', {filename: filename, dupes_address: stats[0]});

    // turf count
    let tref = await this.db.query('match (t:Turf) return count(t)');

    // if turf count is zero, don't bother with the turf indexing
    if (tref[0] !== 0) {
      // create a temporary point layer to do turf indexing
      await this.db.query('call spatial.addLayerWithEncoder({filename}, "NativePointEncoder", "position")', {filename: filename});

      // add this import file's nodes to the temporary point layer
      // TODO: parallel imports of files above the below transaction limit have a possibility of a org.neo4j.kernel.DeadlockDetectedException
      limit = 1000;
      count = limit;

      while (count === limit) {
        let start = new Date().getTime();
        let ref = await this.db.query('match (a:ReferenceNode {name:"spatial_root"}) with collect(a) as lock call apoc.lock.nodes(lock) match (:ImportFile {filename:{filename}})<-[:FILE]-(:ImportRecord)<-[:SOURCE]-(a:Address) where not exists(a.bbox) and not a.position = point({longitude: 0, latitude: 0}) with distinct(a) limit {limit} with collect(a) as nodes call spatial.addNodes({filename}, nodes) yield count return count', {filename: filename, limit: limit});
        count = ref[0];
        console.log("Processed "+count+" records into spatial.addNodes() for temporary layer for "+filename+" in "+((new Date().getTime())-start)+" milliseconds");
      }

      // fetch turfs that touch the bbox of this import set
      let ref;
      try {
        ref = await this.db.query('match (:ImportFile {filename:{filename}})<-[:FILE]-(:ImportRecord)<-[:SOURCE]-(a:Address) with min(a.position) as min, max(a.position) as max call spatial.intersects("turf", "POLYGON(("+min.x+" "+min.y+", "+max.x+" "+min.y+", "+max.x+" "+max.y+", "+min.x+" "+max.y+", "+min.x+" "+min.y+"))") yield node return node.id', {filename: filename});
      } catch (e) {
        // if nothing geocoded, spatial throws; java.lang.RuntimeException: Can't convert null to a geometry
        // give the ref an empty data array
        ref = {data: []};
      }

      console.log("Records for "+filename+" may exist in up to "+ref.length+" turfs; begin turf index processing.");

      // loop through each turfId and add it to
      await asyncForEach(ref, async (turfId) => {
        // TODO: refactor; this is a copy/paste of doTurfIndexing, it's just done on a different spatial layer
        let st = new Date().getTime();
        let t = await this.db.query('CALL apoc.periodic.iterate("match (a:Turf {id:\\"'+turfId+'\\"}) call spatial.intersects(\\"'+filename+'\\", a.wkt) yield node return node, a", "merge (node)-[:WITHIN]->(a)", {batchSize:1000,iterateList:true}) yield total return total', input);
        let total = t[0];
        console.log("Processed "+total+" records for "+turfId+" in "+((new Date().getTime())-st)+" milliseconds");
      });

      // remove the temporary point layer
      await this.db.query('match (a:Address)-[r:RTREE_REFERENCE]-()-[:RTREE_CHILD*0..10]-()-[:RTREE_ROOT]-({layer:{filename}})-[:LAYER]-(:ReferenceNode {name:"spatial_root"}) set a.bbox = null delete r', {filename: filename});
      await this.db.query('call spatial.removeLayer({filename})', {filename: filename});

    }

    // turfadd_start, index_start
    await this.db.query('match (a:ImportFile {filename:{filename}}) set a.turfadd_end = timestamp(), a.index_start = timestamp()', {filename: filename});

    // aquire a write lock so we can only do addNodes from a single job at a time, for heap safety
    // TODO: limit based on max heap
    limit = 1000;
    count = limit;

    while (count === limit) {
      let start = new Date().getTime();
      let ref = await this.db.query('match (a:ReferenceNode {name:"spatial_root"}) with collect(a) as lock call apoc.lock.nodes(lock) match (a:Address)-[:SOURCE]-(:ImportRecord)-[:FILE]-(:ImportFile {filename:{filename}}) where not exists(a.bbox) and not a.position = point({longitude: 0, latitude: 0}) with distinct(a) limit {limit} with collect(distinct(a)) as nodes call spatial.addNodes("address", nodes) yield count return count', {filename: filename, limit: limit});
      count = ref[0];
      console.log("Processed "+count+" records into spatial.addNodes() for "+filename+" in "+((new Date().getTime())-start)+" milliseconds");
    }

    // turfadd_end, completed
    await this.db.query('match (a:ImportFile {filename:{filename}}) set a.index_end = timestamp(), a.completed = timestamp()', {filename: filename});
  }

}

async function doGeocode(db, data) {
  let start = new Date().getTime();
  let file = "";

  // build the "file" to submit
  for (let i in data) {
    // assign a row number to each item
    data[i].idx = i;
    file += i+","+data[i].street+","+data[i].city+","+data[i].state+","+data[i].zip+"\n"
  }

  let fd = new FormData();
  fd.append('benchmark', 'Public_AR_Current');
  fd.append('returntype', 'locations');
  fd.append('addressFile', file, 'import.csv');

  try {
    console.log("Calling census.gov geocoder @ "+start);
    let res = await fetch('https://geocoding.geo.census.gov/geocoder/locations/addressbatch', {
      method: 'POST',
      body: fd
    });

    // they return a csv file, parse it
    let pp = papa.parse(await res.text());

    // map pp back into data
    for (let i in pp) {
      for (let e in data) {
        if (pp[i][0] === data[e].idx) {
          data[e].pp = pp[i];
        }
      }
    }

    // pp has format of:
    // 0   1             2       3                            4                          5                    6           7
    // row,input address,"Match",Exact/Non_Exact/Tie/No_Match,"STREET, CITY, STATE, ZIP","longitude,latitude",some number,L or R side of road
    for (let i in data) {
      let lng = 0, lat = 0;

      // ensure we have a pp array
      if (!data[i].pp) data[i].pp = [];

      // set lat/lng if we got it
      if (data[i].pp[5]) {
        let pos = data[i].pp[5].split(",");
        lng = pos[0];
        lat = pos[1];
      }
      data[i].longitude = lng;
      data[i].latitude = lat;

      // if we got an address back, update it
      if (data[i].pp[4]) {
        let addr = data[i].pp[4].split(", ")
        data[i].street = addr[0];
        data[i].city = addr[1];
        data[i].state = addr[2];
        data[i].zip = addr[3];
      }
    }

    // update database
    await db.query('unwind {data} as r match (a:Address {id:r.id}) set a.street = r.street, a.city = r.city, a.state = r.state, a.zip = r.zip, a.position = point({longitude: toFloat(r.longitude), latitude: toFloat(r.latitude)})', {data: data});

    // update ids
    await db.query('unwind {data} as r match (a:Address {id:r.id}) set a.id = apoc.util.md5([toLower(a.street), toLower(a.city), toLower(a.state), substring(a.zip,0,5)])', {data: data});

    console.log("Geocoded "+data.length+" records in "+((new Date().getTime())-start)+" milliseconds.");

  } catch (e) {
    console.warn(e);
  }

}
