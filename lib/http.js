
import { ov_config } from './ov_config';

function getClientIP(req) {
  if (ov_config.ip_header) return req.header(ov_config.ip_header);
  else return req.connection.remoteAddress;
}

function sendError(res, code, msg) {
  let obj = {code: code, error: true, msg: msg};
  console.log('Returning http '+code+' error with msg: '+msg);
  return res.status(code).json(obj);
}

// just do a query and either return OK or ERROR

export async function cqdo(req, res, q, p, a) {
  if (a === true && req.user.admin !== true)
    return _403(res, "Permission denied.");

  let ref;

  try {
    ref = await req.db.query(q, p);
  } catch (e) {
    return _500(res, e);
  }

  return res.status(200).json({msg: "OK", data: ref.data});
}

export async function onMyTurf(req, ida, idb) {
  if (ida === idb) return true;
  if (await sameTeam(req, ida, idb)) return true;
  try {
    // TODO: extend to also seach for direct turf assignments with leader:true
    let ref = await req.db.query('match (v:Volunteer {id:{idb}}) where exists(v.location) call spatial.intersects("turf", v.location) yield node match (:Volunteer {id:{ida}})-[:MEMBERS {leader:true}]-(:Team)-[:ASSIGNED]-(node) return count(v)', {ida: ida, idb: idb});
    if (ref.data[0] > 0) return true;
  } catch (e) {
    console.warn(e);
  }
  return false;
}

export async function sameTeam(req, ida, idb) {
  try {
    let ref = await req.db.query('match (a:Volunteer {id:{ida}})-[:MEMBERS]-(:Team)-[:MEMBERS]-(b:Volunteer {id:{idb}}) return b', {ida: ida, idb: idb});
    if (ref.data.length > 0) return true;
  } catch (e) {
    console.warn(e);
  }

  return false;
}

export async function volunteerCanSee(req, ida, idb) {
  if (ida === idb) return true;
  if (await sameTeam(req, ida, idb)) return true;
  if (await onMyTurf(req, ida, idb)) return true;
  return false;
}

export async function volunteerAssignments(req) {
  let obj = {
    ready: false,
    teams: [],
    turfs: [],
    forms: [],
  };

  if (req.user.admin) obj.admin = req.user.admin;

  try {
    let ref = await req.db.query('match (a:Volunteer {id:{id}}) optional match (a)-[r:MEMBERS]-(b:Team) with a, collect(b{.*,leader:r.leader}) as teams optional match (a)-[:ASSIGNED]-(b:Form) with a, teams, collect(b{.*,direct:true}) as dforms optional match (a)-[:MEMBERS]-(:Team)-[:ASSIGNED]-(b:Form) with a, teams, dforms + collect(b{.*}) as forms optional match (a)-[:ASSIGNED]-(b:Turf) with a, teams, forms, collect(b{.id,.name,direct:true}) as dturf optional match (a)-[:MEMBERS]-(:Team)-[:ASSIGNED]-(b:Turf) with a, teams, forms, dturf + collect(b{.id,.name}) as turf return teams, forms, turf', req.user);

    obj.teams = ref.data[0][0];
    obj.forms = ref.data[0][1];
    obj.turfs = ref.data[0][2];

    if (ov_config.autoenroll_formid) {
      let b = await req.db.query('match (b:Form {id:{formId}}) return b{.*,direct:true}', {formId: ov_config.autoenroll_formid});
      obj.forms.push(b.data[0]);
      req.user.autoturf = true;
    }

    if (req.user.autoturf && req.user.location) {
      obj.turfs.push({id: 'auto', name: 'auto', direct: true});
    }

  } catch (e) {
    console.warn(e);
  }

  if (obj.turfs.length > 0 && obj.forms.length > 0)
    obj.ready = true;

  return obj;
}

// get the volunteers from the given query, and populate relationships

export async function _volunteersFromCypher(req, query, args) {
  let volunteers = [];

  let ref = await req.db.query(query, args)
  for (let i in ref.data) {
    let c = ref.data[i];
    c.ass = await volunteerAssignments(req, c);
    volunteers.push(c);
  }

  return volunteers;
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

export function _422(res, msg) {
  return sendError(res, 422, msg);
}

export function _500(res, obj) {
  console.warn(obj);
  return sendError(res, 500, "Internal server error.");
}

export function valid(str) {
  if (!str) return false;
  if (typeof str !== "string") return true;
  if (str.match(/\*/)) return false;
  return true;
}
