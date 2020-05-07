import { asyncForEach, initSystemSettings, sleep, min_neo4j_version } from './utils';
import { hv_config } from './hv_config';

import {
  ID_NAME, ID_GENDER, ID_PARTY, ID_REG_VOTER, ID_REC_NOTIF, ID_PHONE, ID_DONOTCALL,
  ID_EMAIL, ID_DOB, ID_US_VET, ID_RACE, ID_LANGS, ID_NOTES,
} from './consts';

var jmx;
var jmxclient = {};
var jvmconfig = {};

export var concurrency = 1;

// tasks to do on startup
export async function doStartupTasks(db, qq, jmx) {
  // required to do in sequence
  if (!hv_config.disable_jmx) await doJmxInit(db, jmx, hv_config);
  let ret = await doDbInit(db);
  if (ret === false) process.exit(1);
  // can happen in parallel
  postDbInit(qq);
}

export async function doJmxInit(db, jmx, config) {
  let start = new Date().getTime();
  console.log("doJmxInit() started @ "+start);

  concurrency = config.job_concurrency;

  try {
    let data;

    jmxclient = jmx.createClient({
      host: config.neo4j_host,
      port: config.neo4j_jmx_port,
      username: config.neo4j_jmx_user,
      password: config.neo4j_jmx_pass,
    });
    await new Promise((resolve, reject) => {
      jmxclient.on('connect', resolve);
      jmxclient.on('error', reject);
      jmxclient.connect();
    });

    data = await new Promise((resolve, reject) => {
      jmxclient.getAttribute("java.lang:type=Memory", "HeapMemoryUsage", resolve);
    });

    let max = data.getSync('max');
    jvmconfig.maxheap = max.longValue;

    data = await new Promise((resolve, reject) => {
      jmxclient.getAttribute("java.lang:type=OperatingSystem", "TotalPhysicalMemorySize", resolve);
    });

    jvmconfig.totalmemory = data.longValue;

    data = await new Promise((resolve, reject) => {
      jmxclient.getAttribute("java.lang:type=OperatingSystem", "AvailableProcessors", resolve);
    });

    jvmconfig.numcpus = data;

    // close the connection
    jmxclient.disconnect();

  } catch (e) {}

  // community edition maxes at 4 cpus
  if (jvmconfig.numcpus && jvmconfig.numcpus > 4) {
    let ref = await db.query('call dbms.components() yield edition');
    if (ref[0] !== 'enterprise') {
      console.warn("WARNING: Your neo4j database host has "+jvmconfig.numcpus+" CPUs but you're not running enterprise edition, so only up to 4 are actually utilized by neo4j.");
      jvmconfig.numcpus = 4;
    }
  }

  // don't let job_concurrency go overboard
  if (concurrency > 1) {
    if (!jvmconfig.numcpus) {
      concurrency = 1;
      console.warn("WARNING: Unable to determine number of CPUs available to neo4j. Unable to honor your JOB_CONCURRENCY setting.");
    } else if (jvmconfig.numcpus <= (concurrency*3)) {
      concurrency = Math.floor(jvmconfig.numcpus/3);
      if (concurrency < 1) concurrency = 1;
      console.warn("WARNING: JOB_CONCURRENCY is set way too high for this database. Lowering it "+concurrency);
    }
  }

  let finish = new Date().getTime();
  console.log("doJmxInit() finished @ "+finish+" after "+(finish-start)+" milliseconds");

  return concurrency;
}

export async function doDbInit(db) {
  let start = new Date().getTime();
  console.log("doDbInit() started @ "+start);

  // make sure we have the plugins we need
  try {
    await db.query('call spatial.procedures()');
    await db.query('call apoc.config.map()');
  } catch (e) {
    console.error("The APOC and SPATIAL plugins are required for this application to function.");
    console.error(e);
    return false;
  }

  let dbv = await db.version();
  if (dbv) {
    let arr = dbv.split('.');
    let ver = Number.parseFloat(arr[0]+'.'+arr[1]);

    if (ver < min_neo4j_version) {
      console.warn("Neo4j version "+min_neo4j_version+" or higher is required.");
      return false;
    }
  }

  await initSystemSettings(db);

  // only call warmup there's enough room to cache the database
  if (!jvmconfig.maxheap || !jvmconfig.totalmemory) {
    console.warn("WARNING: Unable to determine neo4j max heap or total memory. Not initiating database warmup.");
  } else {
    // we're assumiong the host neo4j is running on is dedicated to it; available memory is total system memory minus jvm max heap
    // TODO: check against dbms.memory.pagecache.size configuration as well
    let am = jvmconfig.totalmemory-jvmconfig.maxheap;
    let ds = await db.size();
    if (am < ds) {
      console.warn("WARNING: Database size exceeds available system memory (mem: "+am+" vs. db: "+ds+"). Not initiating database warmup.");
    } else {
      try {
        console.log("Calling apoc.warmup.run(); this may take several minutes.");
        await db.query('call apoc.warmup.run()');
      } catch (e) {}
    }
  }

  let indexes = [
    {label: 'Attribute', property: 'id', create: 'create constraint on (a:Attribute) assert a.id is unique'},
    {label: 'Person', property: 'id', create: 'create constraint on (a:Person) assert a.id is unique'},
    {label: 'Address', property: 'id', create: 'create index on :Address(id)'}, // asserting a.id is unique causes issues so we handle dupes manually
    {label: 'Address', property: 'updated', create: 'create index on :Address(updated)'},
    {label: 'Address', property: 'position', create: 'create index on :Address(position)'},
    {label: 'Address', property: 'bbox', create: 'create index on :Address(bbox)'},
    {label: 'Device', property: 'UniqueID', create: 'create constraint on (a:Device) assert a.UniqueID is unique'},
    {label: 'Volunteer', property: 'id', create: 'create constraint on (a:Volunteer) assert a.id is unique'},
    {label: 'Volunteer', property: 'apikey', create: 'create index on :Volunteer(apikey)'},
    {label: 'Volunteer', property: 'location', create: 'create index on :Volunteer(location)'},
    {label: 'Team', property: 'id', create: 'create constraint on (a:Team) assert a.id is unique'},
    {label: 'Team', property: 'name', create: 'create constraint on (a:Team) assert a.name is unique'},
    {label: 'Turf', property: 'id', create: 'create constraint on (a:Turf) assert a.id is unique'},
    {label: 'Turf', property: 'name', create: 'create constraint on (a:Turf) assert a.name is unique'},
    {label: 'Form', property: 'id', create: 'create constraint on (a:Form) assert a.id is unique'},
    {label: 'Unit', property: 'id', create: 'create constraint on (a:Unit) assert a.id is unique'},
    {label: 'ImportFile', property: 'id', create: 'create constraint on (a:ImportFile) assert a.id is unique'},
    {label: 'ImportFile', property: 'filename', create: 'create constraint on (a:ImportFile) assert a.filename is unique'},
    {label: 'QueueTask', property: 'id', create: 'create constraint on (a:QueueTask) assert a.id is unique'},
    {label: 'QueueTask', property: 'created', create: 'create index on :QueueTask(created)'},
    {label: 'CallerQueue', property: 'created', create: 'create index on :CallerQueue(created)'},
  ];

  // create any indexes we need if they don't exist
  await asyncForEach(indexes, async (index) => {
    let ref = await db.query('call db.indexes() yield tokenNames, properties with * where {label} in tokenNames and {property} in properties return count(*)', index);
    if (ref[0] === 0) await db.query(index.create);
  });

  let spatialLayers = [
    {name: "turf", create: 'call spatial.addWKTLayer("turf", "wkt")'},
    {name: "address", create: 'call spatial.addLayerWithEncoder("address", "NativePointEncoder", "position")'},
  ];

  // create any spatial layers we need if they don't exist
  await asyncForEach(spatialLayers, async (layer) => {
    let ref = await db.query('match (a {layer:{layer}})-[:LAYER]-(:ReferenceNode {name:"spatial_root"}) return count(a)', {layer: layer.name});
    if (ref[0] === 0) {
      await db.query(layer.create);
      await sleep(1000);
    }
  });

  // TODO: load race/language data from a 3rd party and have the client do "autocomplete" type functionality

  // common attributes that should be interchangeable between systems
  let defaultAttributes = [
    {id: ID_NAME, name: "Name", order: 0, type: "string", multi: false},
    {id: ID_GENDER, name: "Gender", order: 1, type: "string", multi: false, values: ["Male","Female","Non-Binary"]},
    {id: ID_PARTY, name: "Party Affiliation", order: 2, type: "string", multi: false, values: ["No Party Preference","Democratic","Republican","Green","Libertarian","Other"]},
    {id: ID_REG_VOTER, name: "Registered to Vote", order: 3, type: "boolean", multi: false},
    {id: ID_REC_NOTIF, name: "Receive Notifications", order: 4, type: "string", multi: true, values: ["Phone","Text","Email"]},
    {id: ID_PHONE, name: "Phone Number", order: 5, type: "string", multi: true},
    {id: ID_DONOTCALL, name: "Do Not Call", order: 6, type: "boolean", multi: false},
    {id: ID_EMAIL, name: "Email Address", order: 7, type: "string", multi: true},
    {id: ID_DOB, name: "Date of Birth", order: 8, type: "date", multi: false},
    {id: ID_US_VET, name: "US Military Veteran", order: 9, type: "boolean", multi: false},
    {id: ID_RACE, name: "Race and Ethnicity", order: 11, type: "string", multi: true, values: ["Prefer not to say","African American","Asian","Hispanic","Latino","Native American","Pacific Islander","White"]},
    {id: ID_LANGS, name: "Spoken Languages", order: 12, type: "string", multi: true, values: ["English","Spanish","Chinese","Arabic","French","German"]},
    {id: ID_NOTES, name: "Notes", order: 13, type: "textbox", multi: false},
  ];

  await asyncForEach(defaultAttributes, async (attribute) => {
    let ref = await db.query('match (a:Attribute {id:{id}}) return count(a)', {id: attribute.id});
    if (ref[0] === 0) {
      await db.query('create (:Attribute {id:{id},name:{name},order:{order},type:{type},multi:{multi}})', attribute);
      if (attribute.values) await db.query('match (a:Attribute {id:{id}}) set a.values = {values}', attribute);
    }
  });

  let finish = new Date().getTime();
  console.log("doDbInit() finished @ "+finish+" after "+(finish-start)+" milliseconds");

  return true;
}

async function postDbInit(qq) {
  let start = new Date().getTime();
  console.log("postDbInit() started @ "+start);

  // assume any "active" tasks on startup died on whatever shut us down, and mark them as failed
  await qq.clearQueue("Task was active upon server startup and thus marked as failed.");

  let finish = new Date().getTime();
  console.log("postDbInit() finished @ "+finish+" after "+(finish-start)+" milliseconds");
}
