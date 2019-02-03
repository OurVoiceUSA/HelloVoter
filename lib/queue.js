
import { asyncForEach, sleep } from 'ourvoiceusa-sdk-js';
import EventEmitter from 'events';
import FormData from 'form-data';
import fetch from 'node-fetch';
import papa from 'papaparse';

import { concurrency } from './startup.js';
import { cqa } from './neo4j.js';

var queue = new EventEmitter()

export async function queueTask(task, pattern, input) {
  let job;

  // create QueueTask object in database -- either we can execute now (active: true, started: timestamp()) or we have to wait (active: false)
  try {
    let args = JSON.parse(JSON.stringify(input)); // deep copy to get pattern params
    args.input = JSON.stringify(input);
    args.task = task;

    job = await cqa('match (a:QueueTask {active: true}) with count(a) as jobs call apoc.do.when(jobs < 3, "create (a:QueueTask {id: randomUUID(), created: timestamp(), started: timestamp(), task: task, input: input, active: true}) return a", "create (a:QueueTask {id: randomUUID(), created: timestamp(), task: task, input: input, active: false}) return a", {task: {task}, input: {input}}) yield value match (a:QueueTask {id:value.a.id}) match (b:'+pattern+') merge (b)-[:PROCESSED_BY]->(a) return a', args);
  } catch (e) {
    console.warn("Houston we have a problem.");
    console.warn(e);
    return;
  }

  // find out whether we execute or enqueue
  if (job.data[0].active) {
    queue.emit('doTask', job.data[0].id);
  } else {
    console.log("Enqueued task "+task);
  }

  return job.data[0];
}

export async function clearQueue(msg) {
  // when clearing the queue, assume any "active" tasks are dead, and mark them as failed
  await cqa('match (a:QueueTask {active: true}) set a.active = false, a.completed = timestamp(), a.success = false, a.error = {msg}', {msg: msg});
  queue.emit('checkQueue');
}

queue.on('doTask', async function (id) {
  let task; 
  let error = false;
  let start = new Date().getTime();

  try {
    let job = await cqa('match (a:QueueTask {id:{id}}) return a', {id: id});

    if (!job.data[0])
      throw new Error("QueueTask with id "+id+" does not exist.");

    task = job.data[0].task;
    console.log(task+"() started @ "+start);

    let ret = await queueTasks[task](id, JSON.parse(job.data[0].input));

    // mark job as success
    await cqa('match (a:QueueTask {id:{id}}) set a.active = false, a.completed = timestamp(), a.success = true, a.error = null', {id: id});
  } catch (e) {
    console.warn("Caught exception while executing task: "+task);
    console.warn(e);
    // mark job as failed
    await cqa('match (a:QueueTask {id:{id}}) set a.active = false, a.completed = timestamp(), a.success = false, a.error = {error}', {
      id: id,
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
});

queue.on('checkQueue', async function () {
  console.log("Checking queue for tasks to run...");
  try {
    let ref = await cqa('match (a:QueueTask {active: true}) return count(a)');
    let running = ref.data[0];
    if (running >= concurrency) {
      console.log("Too many tasks running to start another.");
      return;
    }

    let job = await cqa('match (a:QueueTask) where a.active = false and not exists(a.started) with a limit 1 set a.active = true, a.started = timestamp() return a');
    if (!job.data[0]) {
      console.log("No tasks in queue to execute.");
      return;
    }

    queue.emit('doTask', job.data[0].id);

    // check again if we have capacity to run more
    if ((running+1) < concurrency) queue.emit('checkQueue');

  } catch (e) {
    console.warn("Houston we have a problem.");
    console.warn(e);
    return;
  }
});

var queueTasks = {};

queueTasks.doTurfIndexing = async function (jobId, input) {
  let start = new Date().getTime();

  let ref = await cqa('CALL apoc.periodic.iterate("match (a:Turf {id:\\"'+input.turfId+'\\"}) call spatial.intersects(\\"address\\", a.wkt) yield node return node, a", "merge (node)-[:WITHIN]->(a)", {batchSize:10000,iterateList:true}) yield total return total', input);
  let total = ref.data[0];
  console.log("Processed "+total+" records for "+input.turfId+" in "+((new Date().getTime())-start)+" milliseconds");

  return {total: total};
}

queueTasks.doProcessImport = async function (jobId, input) {
  // TODO: status update to queue after each db query
  let filename = input.filename;
  let stats;

  // if no pid, create with randomUUID()
  await cqa('match (a:ImportFile {filename:{filename}})<-[:FILE]-(b:ImportRecord) where b.pid = "" set b.pid = randomUUID()', {filename: filename});

  // parse_start
  await cqa('match (a:ImportFile {filename:{filename}}) set a.parse_start = timestamp()', {filename: filename});

  let limit = 100000;

  // non-unit addresses
  await cqa(`match (a:ImportFile {filename:{filename}})
    CALL apoc.periodic.iterate("match (a)<-[:FILE]-(b:ImportRecord) where b.unit = '' return b",
      "merge (c:Address {id:apoc.util.md5([toLower(b.street), toLower(b.city), toLower(b.state), substring(b.zip,0,5)])})
        on create set c += {created: timestamp(), updated: timestamp(), longitude: toFloat(b.lng), latitude: toFloat(b.lat), position: point({longitude: toFloat(b.lng), latitude: toFloat(b.lat)}), street:b.street, city:b.city, state:b.state, zip:b.zip}
      merge (c)-[:SOURCE]->(b)
      with b,c
      where not b.name = ''
      merge (d:Person {id:b.pid})
        on create set d.name = b.name
      merge (d)-[:SOURCE]->(b)
      merge (d)-[:RESIDENCE]->(c)",
    {batchSize:{limit},iterateList:true}) yield total return total
  `, {filename: filename, limit: limit});

  // multi-unit addresses
  await cqa(`match (a:ImportFile {filename:{filename}})
    CALL apoc.periodic.iterate("match (a)<-[:FILE]-(b:ImportRecord) where not b.unit = '' return b",
      "merge (c:Address {id:apoc.util.md5([toLower(b.street), toLower(b.city), toLower(b.state), substring(b.zip,0,5)])})
        on create set c += {created: timestamp(), updated: timestamp(), longitude: toFloat(b.lng), latitude: toFloat(b.lat), position: point({longitude: toFloat(b.lng), latitude: toFloat(b.lat)}), street:b.street, city:b.city, state:b.state, zip:b.zip}
      merge (e:Unit {name:b.unit})-[:AT]->(c)
      merge (c)-[:SOURCE]->(b)
      merge (e)-[:SOURCE]->(b)
      with b,e
      where not b.name = '' 
      merge (d:Person {id:b.pid})
        on create set d.name = b.name
      merge (d)-[:SOURCE]->(b)
      merge (d)-[:RESIDENCE]->(e)",
    {batchSize:{limit},iterateList:true}) yield total return total
    `, {filename: filename, limit: limit});

  // loop through attributes and create them per person
  await cqa('match (a:Person)-[:SOURCE]->(b:ImportRecord)-[:FILE]->(c:ImportFile {filename:{filename}})-[:ATTRIBUTES]->(d:Attribute) create (e:PersonAttribute {value:b[d.name]})-[:ATTRIBUTE_OF {current:true}]->(a) create (e)-[:COLLECTED_ON]->(c) create (e)-[:ATTRIBUTE_TYPE]->(d)', {filename: filename});

  // loop through attributes with multi:false and remove {current:true} property on older sources

  // parse_end + num_*, geocode_start
  stats = await cqa('match (a:ImportFile {filename:{filename}})<-[:FILE]-(b:ImportRecord)<-[:SOURCE]-(c:Address)-[*0..1]-()-[:RESIDENCE]-(d:Person) return count(distinct(b)), count(distinct(c)), count(distinct(d))', {filename: filename});
  let num_addresses = stats.data[0][1]; // save for below
  await cqa('match (a:ImportFile {filename:{filename}}) set a.parse_end = timestamp(), a.geocode_start = timestamp(), a.num_records = toInt({num_records}), a.num_addresses = toInt({num_addresses}), a.num_people = toInt({num_people})', {filename: filename, num_records: stats.data[0][0], num_addresses: stats.data[0][1], num_people: stats.data[0][2]});

  // geocoding
  // census has a limit of 10k per batch
  limit = 10000;
  let count = limit;

  while (count === limit) {
    let ref = await cqa('match (:ImportFile {filename:{filename}})<-[:FILE]-(:ImportRecord)<-[:SOURCE]-(a:Address) where a.position is null return distinct(a) limit {limit}', {filename: filename, limit: limit});
    count = ref.data.length;
    if (count) await doGeocode(ref.data);
  }

  // geocode_end, geocode_success/fail, dedupe_start
  stats = await cqa('match (:ImportFile {filename:{filename}})<-[:FILE]-(:ImportRecord)<-[:SOURCE]-(a:Address) where a.position = point({longitude: 0, latitude: 0}) return count(a)', {filename: filename});
  await cqa('match (a:ImportFile {filename:{filename}}) set a.geocode_end = timestamp(), a.geocode_success = toInt({geocode_success}), a.goecode_fail = toInt({goecode_fail}), a.dedupe_start = timestamp()', {filename: filename, geocode_success: (num_addresses-stats.data[0]), goecode_fail: stats.data[0]});

  // find instances of duplicate Address(id) and merge them into a single node
  // TODO: we only merge :Address here - can still have dupe Unit & Person nodes
  stats = await cqa('match (a:ImportFile {filename: {filename}}) call apoc.periodic.iterate("match (aa:Address)-[:SOURCE]->(:ImportRecord)-[:FILE]->(:ImportFile {filename:\\""+a.filename+"\\"}) with distinct(aa) as a match (b:Address {id:a.id}) with a, count(b) as count where count > 1 return distinct(a.id) as id", "match (a:Address {id:{id}}) with collect(a) as nodes call apoc.refactor.mergeNodes(nodes) yield node return node", {iterateList:false}) yield total return total', {filename: filename});

  // dedupe_end, dupes, turfadd_start
  await cqa('match (a:ImportFile {filename:{filename}}) set a.dedupe_end = timestamp(), a.dupes_address = toInt({dupes_address}), a.turfadd_start = timestamp()', {filename: filename, dupes_address: stats.data[0]});

  // create a temporary point layer to do turf indexing
  await cqa('call spatial.addPointLayer({filename})', {filename: filename});

  // add this import file's nodes to the temporary point layer
  // TODO: parallel imports of files above the below transaction limit have a possibility of a org.neo4j.kernel.DeadlockDetectedException
  limit = 100000;
  count = limit;

  while (count === limit) {
    let start = new Date().getTime();
    let ref = await cqa('match (a:ReferenceNode {name:"spatial_root"}) with collect(a) as lock call apoc.lock.nodes(lock) match (:ImportFile {filename:{filename}})<-[:FILE]-(:ImportRecord)<-[:SOURCE]-(a:Address) where not exists(a.bbox) and not a.position = point({longitude: 0, latitude: 0}) with distinct(a) limit {limit} with collect(a) as nodes call spatial.addNodes({filename}, nodes) yield count return count', {filename: filename, limit: limit});
    count = ref.data[0];
    console.log("Processed "+count+" records into spatial.addNodes() for temporary layer for "+filename+" in "+((new Date().getTime())-start)+" milliseconds");
  }

  // fetch turfs that touch the bbox of this import set
  let ref;
  try {
    ref = await cqa('match (:ImportFile {filename:{filename}})<-[:FILE]-(:ImportRecord)<-[:SOURCE]-(a:Address) with min(a.position) as min, max(a.position) as max call spatial.intersects("turf", "POLYGON(("+min.x+" "+min.y+", "+max.x+" "+min.y+", "+max.x+" "+max.y+", "+min.x+" "+max.y+", "+min.x+" "+min.y+"))") yield node return node.id', {filename: filename});
  } catch (e) {
    // if nothing geocoded, spatial throws; java.lang.RuntimeException: Can't convert null to a geometry
    // give the ref an empty data array
    ref = {data: []};
  }

  console.log("Records for "+filename+" may exist in up to "+ref.data.length+" turfs; begin turf index processing.");

  // loop through each turfId and add it to 
  await asyncForEach(ref.data, async (turfId) => {
    // TODO: refactor; this is a copy/paste of doTurfIndexing, it's just done on a different spatial layer
    let st = new Date().getTime();
    let t = await cqa('CALL apoc.periodic.iterate("match (a:Turf {id:\\"'+turfId+'\\"}) call spatial.intersects(\\"'+filename+'\\", a.wkt) yield node return node, a", "merge (node)-[:WITHIN]->(a)", {batchSize:10000,iterateList:true}) yield total return total', input);
    let total = t.data[0];
    console.log("Processed "+total+" records for "+turfId+" in "+((new Date().getTime())-st)+" milliseconds");
  });

  // remove the temporary point layer
  await cqa('match (a:Address)-[r:RTREE_REFERENCE]-()-[:RTREE_CHILD*0..10]-()-[:RTREE_ROOT]-({layer:{filename}})-[:LAYER]-(:ReferenceNode {name:"spatial_root"}) set a.bbox = null delete r', {filename: filename});
  await cqa('call spatial.removeLayer({filename})', {filename: filename});

  // turfadd_start, index_start
  await cqa('match (a:ImportFile {filename:{filename}}) set a.turfadd_end = timestamp(), a.index_start = timestamp()', {filename: filename});

  // aquire a write lock so we can only do addNodes from a single job at a time, for heap safety
  // TODO: limit based on max heap
  limit = 100000;
  count = limit;

  while (count === limit) {
    let start = new Date().getTime();
    let ref = await cqa('match (a:ReferenceNode {name:"spatial_root"}) with collect(a) as lock call apoc.lock.nodes(lock) match (a:Address)-[:SOURCE]-(:ImportRecord)-[:FILE]-(:ImportFile {filename:{filename}}) where not exists(a.bbox) and not a.position = point({longitude: 0, latitude: 0}) with distinct(a) limit {limit} with collect(distinct(a)) as nodes call spatial.addNodes("address", nodes) yield count return count', {filename: filename, limit: limit});
    count = ref.data[0];
    console.log("Processed "+count+" records into spatial.addNodes() for "+filename+" in "+((new Date().getTime())-start)+" milliseconds");
  }

  // turfadd_end, completed
  await cqa('match (a:ImportFile {filename:{filename}}) set a.index_end = timestamp(), a.completed = timestamp()', {filename: filename});
}

async function doGeocode(data) {
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

    // map pp.data back into data
    for (let i in pp.data) {
      for (let e in data) {
        if (pp.data[i][0] === data[e].idx) {
          data[e].pp = pp.data[i];
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
    await cqa('unwind {data} as r match (a:Address {id:r.id}) set a.street = r.street, a.city = r.city, a.state = r.state, a.zip = r.zip, a.longitude = toFloat(r.longitude), a.latitude = toFloat(r.latitude), a.position = point({longitude: toFloat(r.longitude), latitude: toFloat(r.latitude)})', {data: data});

    // update ids
    await cqa('unwind {data} as r match (a:Address {id:r.id}) set a.id = apoc.util.md5([toLower(a.street), toLower(a.city), toLower(a.state), substring(a.zip,0,5)])', {data: data});

    console.log("Geocoded "+data.length+" records in "+((new Date().getTime())-start)+" milliseconds.");

  } catch (e) {
    console.warn(e);
  }

}

