import { hv_config } from './hv_config';

export var min_neo4j_version = 3.5;
export var systemSettings = {};

export async function initSystemSettings(db) {
  let defaultSettings = [
    {id: 'debug', value: false},
  ];

  await asyncForEach(defaultSettings, async (ss) => {
    // ensure system settings exist
    let ref = await db.query('match (ss:SystemSetting {id:{id}}) return ss.value', ss);
    if (ref.length === 0) {
      await db.query('create (:SystemSetting {id:{id},value:{value}})', ss);
      ref[0] = ss.value;
    }
    systemSettings[ss.id] = ref[0];
  });
}

export function getClientIP(req) {
  if (hv_config.ip_header) return req.header(hv_config.ip_header);
  else return req.connection.remoteAddress;
}

function sendError(res, code, msg) {
  let obj = {code: code, error: true, msg: msg};
  console.warn('Returning http '+code+' error with msg: '+msg);
  return res.status(code).json(obj);
}

export async function volunteerAssignments(req, type, vol) {
  let obj = {
    ready: false,
    turfs: [],
    forms: [],
  };
  let members = "MEMBERS";
  let assigned = "ASSIGNED";

  if (vol.admin) obj.admin = vol.admin;
  if (type === 'QRCode') {
    members = "AUTOASSIGN_TO";
    assigned = "AUTOASSIGN_TO";
  }

  let ref = await req.db.query('match (a:'+type+' {id:{id}}) optional match (a)-[r:'+members+']-(b:Team) with a, collect(b{.*,leader:r.leader}) as teams optional match (a)-[:'+assigned+']-(b:Form) with a, teams, collect(b{.*,direct:true}) as dforms optional match (a)-[:'+members+']-(:Team)-[:ASSIGNED]-(b:Form) with a, teams, dforms + collect(b{.*}) as forms optional match (a)-[:'+assigned+']-(b:Turf) with a, teams, forms, collect(b{.id,.name,direct:true}) as dturf optional match (a)-[:'+members+']-(:Team)-[:ASSIGNED]-(b:Turf) with a, teams, forms, dturf + collect(b{.id,.name}) as turf return forms, turf', vol);

  obj.forms = ref[0][0];
  obj.turfs = ref[0][1];

  if (obj.turfs.length > 0 && obj.forms.length > 0)
    obj.ready = true;

  return obj;
}

// get the volunteers from the given query, and populate relationships

export async function _volunteersFromCypher(req, query, args) {
  let volunteers = [];

  let ref = await req.db.query(query, args)
  for (let i in ref) {
    let c = ref[i];
    c.ass = await volunteerAssignments(req, 'Volunteer', c);
    volunteers.push(c);
  }

  return volunteers;
}

export async function generateToken({ crypto, stringBase = 'base64', byteLength = 48 } = {}) {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(byteLength, (err, buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(base64edit(buffer.toString(stringBase)));
      }
    });
  });
}

export function base64edit(str) {
  return str
    .replace(/=/g, '_')
    .replace(/\+/g, '.')
    .replace(/\//g, '-');
}

export function _400(res, msg) {
  return sendError(res, 400, msg);
}

export function _401(res, msg) {
  return sendError(res, 401, msg);
}

export function _403(res, msg) {
  return sendError(res, 403, msg);
}

export function _404(res, msg) {
  return sendError(res, 404, msg);
}

export function _422(res, msg) {
  return sendError(res, 422, msg);
}

export function _500(res, obj) {
  console.warn(obj);
  return sendError(res, 500, "Internal server error.");
}

export function _501(res, msg) {
  return sendError(res, 501, msg);
}

export function valid(str) {
  if (!str) return false;
  if (typeof str !== "string") return true;
  if (str.match(/\*/)) return false;
  return true;
}

export async function asyncForEach(a, c) {
  let ret = [];
  for (let i = 0; i < a.length; i++) ret[i] = await c(a[i], i, a);
  return ret;
}

export async function sleep(t) {
  if (process.env['TEST_EXEC']) return new Promise(r => r());
  return new Promise(r => setTimeout(r, t));
}
