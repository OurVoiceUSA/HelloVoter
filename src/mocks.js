import jwt from 'jsonwebtoken';

const sleep = m => new Promise(r => setTimeout(r, m));

const team_a = {
  id: "test:teama",
  name: "Team A",
};
const team_b = {
  id: "test:teamb",
  name: "Team B",
};

const form_a = {
  id: "test:forma",
  name: "Form A",
};
const form_b = {
  id: "test:formb",
  name: "Form B",
};

const turf_region = {
  id: "test:reagion",
  name: "Test Region",
};
const turf_a = {
  id: "test:turfa",
  name: "Turf A",
};
const turf_b = {
  id: "test:turfb",
  name: "Turf B",
};

team_a.turfs = [turf_a];
team_a.forms = [form_a];

team_b.turfs = [turf_b];
team_b.forms = [form_b];

const mock_admin = {
  id: "test:admin",
  admin: true,
  name: "Administrator",
  avatar: "https://cdn0.iconfinder.com/data/icons/viking-2/500/viking_4-512.png",
  ass: {
    ready: false,
    direct: false,
    turf: [turf_a, turf_b],
    teams: [],
    teamperms: [],
    forms: [],
}};
const mock_region_leader = {
  id: "test:regionleader",
  name: "Region Leader",
  avatar: "https://cdn.iconscout.com/icon/premium/png-256-thumb/thor-3-159482.png",
  ass: {
    ready: false,
    direct: false,
    leader: true,
    turf: [turf_a, turf_b],
    teams: [],
    teamperms: [],
    forms: [],
}};
const mock_team_a_leader = {
  id: "test:teamaleader",
  name: "Team A Leader",
  avatar: "https://cdn.iconscout.com/icon/premium/png-256-thumb/thor-3-159482.png",
  ass: {
    ready: true,
    direct: false,
    leader: true,
    turf: [turf_a],
    teams: [team_a],
    teamperms: [{leader: true}],
    forms: [form_a],
}};
const mock_team_b_leader = {
  id: "test:teambleader",
  name: "Team B Leader",
  avatar: "https://cdn.iconscout.com/icon/premium/png-256-thumb/thor-3-159482.png",
  ass: {
    ready: true,
    direct: false,
    leader: true,
    turf: [turf_b],
    teams: [team_b],
    teamperms: [{leader: true}],
    forms: [form_b],
}};
const mock_team_a_member = {
  id: "test:teamamember",
  name: "Team A Member",
  avatar: "https://d1nhio0ox7pgb.cloudfront.net/_img/o_collection_png/green_dark_grey/256x256/plain/chess_piece_rook.png",
  ass: {
    ready: true,
    direct: false,
    turf: [turf_a],
    teams: [team_a],
    teamperms: [{}],
    forms: [form_a],
}};
const mock_team_b_member = {
  id: "test:teambmember",
  name: "Team B Member",
  avatar: "https://d1nhio0ox7pgb.cloudfront.net/_img/o_collection_png/green_dark_grey/256x256/plain/chess_piece_rook.png",
  ass: {
    ready: true,
    direct: false,
    turf: [turf_b],
    teams: [team_b],
    teamperms: [{}],
    forms: [form_b],
}};
const mock_solo_volunteer = {
  id: "test:solo",
  name: "Solo Volunteer",
  avatar: "http://comic-cons.xyz/wp-content/uploads/Star-Wars-avatars-Movie-Han-Solo-Harrison-Ford.jpg",
  homeaddress: "1234 Nerf Herder Rd., Millennium, Falcon, Galaxy Far Away",
  homelng: -118.3281370,
  homelat: 33.9208231,
  ass: {
    ready: true,
    direct: true,
    turf: [turf_a],
    teams: [],
    teamperms: [],
    forms: [form_a],
}};
const mock_unassigned = {
  id: "test:unassigned",
  name: "Unassigned Volunteer",
  avatar: "https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/emojione/151/shrug_1f937.png",
  homeaddress: "Please help me!",
  ass: {
    ready: false,
    direct: false,
    turf: [],
    teams: [],
    teamperms: [],
    forms: [],
  }
}
const mock_denied = {
  id: "test:denied",
  locked: true,
  name: "Denied Volunteer",
  avatar: "https://cdn1.iconfinder.com/data/icons/users-vol-3/32/user-man-lock-block-512.png",
  homeaddress: "Who cares?",
  ass: {
    ready: false,
    direct: false,
    turf: [],
    teams: [],
    teamperms: [],
    forms: [],
  }
}

export const mocked_users = [
  {value: mock_admin, label: mock_admin.name},
  {value: mock_region_leader, label: mock_region_leader.name},
  {value: mock_team_a_leader, label: mock_team_a_leader.name},
  {value: mock_team_a_member, label: mock_team_a_member.name},
  {value: mock_team_b_leader, label: mock_team_b_leader.name},
  {value: mock_team_b_member, label: mock_team_b_member.name},
  {value: mock_solo_volunteer, label: mock_solo_volunteer.name},
  {value: mock_unassigned, label: mock_unassigned.name},
  {value: mock_denied, label: mock_denied.name},
];

export async function mockFetch(token, uri, method, body) {
  let id, arr = [], dashboard, volunteer, volunteers, teams, turfs, forms;

  if (uri.match(/=/)) id = uri.split('=').pop();

  // fake wait time
  await sleep(500);

  let user = jwt.decode(token);

  // define test data based on user
  switch (user.id) {
    case "test:admin":
      volunteer = mock_admin;
      volunteers = [mock_admin, mock_region_leader, mock_team_a_leader, mock_team_b_leader, mock_team_a_member, mock_team_b_member, mock_solo_volunteer, mock_unassigned, mock_denied];
      teams = [team_a, team_b];
      turfs = [turf_region, turf_a, turf_b];
      forms = [form_a, form_b];
      break;
    case "test:regionleader":
      volunteer = mock_region_leader;
      volunteers = [mock_region_leader, mock_team_a_leader, mock_team_b_leader, mock_team_a_member, mock_team_b_member, mock_solo_volunteer, mock_unassigned, mock_denied];
      teams = [team_a, team_b];
      turfs = [turf_region, turf_a, turf_b];
      forms = [form_a, form_b];
      break;
    case "test:teamaleader":
      volunteer = mock_team_a_leader;
      volunteers = [mock_team_a_leader, mock_team_a_member, mock_solo_volunteer, mock_denied];
      teams = [team_a];
      turfs = [turf_a];
      forms = volunteer.ass.forms;
      break;
    case "test:teambleader":
      volunteer = mock_team_b_leader;
      volunteers = [mock_team_b_leader, mock_team_b_member, mock_unassigned];
      teams = [team_b];
      turfs = [turf_b];
      forms = volunteer.ass.forms;
      break;
    case "test:teamamember":
      volunteer = mock_team_a_member;
      volunteers = [mock_team_a_leader, mock_team_a_member];
      teams = [team_a];
      turfs = [turf_a];
      forms = volunteer.ass.forms;
      break;
    case "test:teambmember":
      volunteer = mock_team_b_member;
      volunteers = [mock_team_b_leader, mock_team_b_member];
      teams = [team_b];
      turfs = [turf_b];
      forms = volunteer.ass.forms;
      break;
    case "test:solo":
      volunteer = mock_solo_volunteer;
      volunteers = [mock_solo_volunteer];
      teams = [];
      turfs = [turf_a];
      forms = volunteer.ass.forms;
      break;
    case "test:unassigned":
      volunteer = mock_unassigned;
      volunteers = [mock_unassigned];
      teams = [];
      turfs = [];
      forms = [];
      break;
    case "test:denied":
      volunteer = mock_denied;
      volunteers = [mock_denied];
      teams = [];
      turfs = [];
      forms = [];
      break;
    default:
      throw new Error("User not mocked: "+user.id);
  }

  dashboard = {volunteers: volunteers.length, teams: teams.length, turfs: turfs.length, forms: forms.length, questions: 0, addresses: 0, dbsize: 0};

  // return test data based on URI
  switch (true) {
    case /v1\/dashboard/.test(uri): return dashboard;
    case /v1\/volunteer\/list/.test(uri): return volunteers;
    case /v1\/volunteer\/get/.test(uri):
      for (let i in mocked_users) if (mocked_users[i].value.id === id) return mocked_users[i].value;
      return {};
    case /v1\/team\/list/.test(uri): return {data: teams};
    case /v1\/team\/get/.test(uri):
      for (let i in teams) if (teams[i].id === id) arr.push(teams[i]);
      return {data: arr};
    case /v1\/team\/members\/list/.test(uri):
      for (let i in volunteers) {
        for (let t in volunteers[i].ass.teams) {
            if (volunteers[i].ass.teams[t].id === id) arr.push(volunteers[i]);
          }
      }
      return arr;
    case /v1\/team\/turf\/list/.test(uri):
      for (let i in teams) {
        if (teams[i].id === id) arr = teams[i].turfs;
      }
      return {data: arr};
    case /v1\/turf\/list/.test(uri): return {data: turfs};
    case /v1\/form\/list/.test(uri): return {data: forms};
    case /v1\/team\/form\/list/.test(uri):
      for (let i in teams) {
        if (teams[i].id === id) arr = teams[i].forms;
      }
      return {data: arr};
    case /v1\/turf\/assigned\/volunteer\/list/.test(uri):
      for (let i in volunteers) {
        if (volunteers[i].ass.direct) {
          for (let f in volunteers[i].ass.turfs)
            if (volunteers[i].ass.turfs[f].id === id) arr.push(volunteers[i]);
        }
      }
      return arr;
    case /v1\/turf\/assigned\/team\/list/.test(uri):
      for (let i in teams) {
        for (let f in teams[i].turfs) {
          if (teams[i].turfs[f].id === id) {
            arr.push(teams[i].turfs[f]);
          }
        }
      }
      return {data: arr};
    case /v1\/turf\/get/.test(uri):
      for (let i in turfs) if (turfs[i].id === id) return turfs[i];
      return {};
    case /v1\/form\/assigned\/volunteer\/list/.test(uri):
      for (let i in volunteers) {
        if (volunteers[i].ass.direct) {
          for (let f in volunteers[i].ass.forms)
            if (volunteers[i].ass.forms[f].id === id) arr.push(volunteers[i]);
        }
      }
      return arr;
    case /v1\/form\/assigned\/team\/list/.test(uri):
      for (let i in teams) {
        for (let f in teams[i].forms) {
          if (teams[i].forms[f].id === id) {
            arr.push(teams[i].forms[f]);
          }
        }
      }
      return {data: arr};
    case /v1\/form\/get/.test(uri):
      for (let i in forms) if (forms[i].id === id) return forms[i];
      return {};
    default:
      throw new Error("URI not mocked: "+uri);
  }
}
