import jwt from 'jsonwebtoken';

const sleep = m => new Promise(r => setTimeout(r, m));

const mock_admin = {"id": "test:admin", "name": "Administrator", "avatar": "https://cdn0.iconfinder.com/data/icons/viking-2/500/viking_4-512.png"};
const mock_region_leader = {"id": "test:regionleader", "name": "Region Leader", "avatar": "https://cdn.iconscout.com/icon/premium/png-256-thumb/thor-3-159482.png"};
const mock_team_a_leader = {"id": "test:teamaleader", "name": "Team A Leader", "avatar": "https://cdn.iconscout.com/icon/premium/png-256-thumb/thor-3-159482.png"};
const mock_team_b_leader = {"id": "test:teambleader", "name": "Team B Leader", "avatar": "https://cdn.iconscout.com/icon/premium/png-256-thumb/thor-3-159482.png"}
const mock_team_a_member = {"id": "test:teamamember", "name": "Team A Member", "avatar": "https://d1nhio0ox7pgb.cloudfront.net/_img/o_collection_png/green_dark_grey/256x256/plain/chess_piece_rook.png"};
const mock_team_b_member = {"id": "test:teambmember", "name": "Team B Member", "avatar": "https://d1nhio0ox7pgb.cloudfront.net/_img/o_collection_png/green_dark_grey/256x256/plain/chess_piece_rook.png"};
const mock_solo_volunteer = {"id": "test:solo", "name": "Solo Volunteer", "avatar": "http://comic-cons.xyz/wp-content/uploads/Star-Wars-avatars-Movie-Han-Solo-Harrison-Ford.jpg"};

export const mocked_users = [
  {value: mock_admin, label: mock_admin.name},
  {value: mock_region_leader, label: mock_region_leader.name},
  {value: mock_team_a_leader, label: mock_team_a_leader.name},
  {value: mock_team_b_leader, label: mock_team_b_leader.name},
  {value: mock_team_a_member, label: mock_team_a_member.name},
  {value: mock_team_b_member, label: mock_team_b_member.name},
  {value: mock_solo_volunteer, label: mock_solo_volunteer.name},
];

const team_a = {id: "test:teama", name: "Team A"};
const team_b = {id: "test:teamb", name: "Team B"};

const team_a_members = [mock_team_a_leader, mock_team_a_member];
const team_b_members = [mock_team_b_leader, mock_team_b_member];

export async function mockFetch(token, uri, method, body) {
  let dashboard, teams;

  // fake wait time
  await sleep(500);

  let user = jwt.decode(token);

  // define test data based on user
  switch (user.id) {
    case "test:admin":
      dashboard = {volunteers: mocked_users.length, teams: 2, turfs: 0, forms: 0, questions: 0, addresses: 0, dbsize: 0};
      teams = [team_a, team_b];
      break;
    case "test:regionleader":
      dashboard = {volunteers: mocked_users.length-1, teams: 2, turfs: 0, forms: 0, questions: 0, addresses: 0, dbsize: 0};
      teams = [team_a, team_b];
      break;
    case "test:teamaleader":
      dashboard = {volunteers: team_a_members.length, teams: 1, turfs: 0, forms: 0, questions: 0, addresses: 0, dbsize: 0};
      teams = [team_a];
      break;
    case "test:teambleader":
      dashboard = {volunteers: team_b_members.length, teams: 1, turfs: 0, forms: 0, questions: 0, addresses: 0, dbsize: 0};
      teams = [team_b];
      break;
    case "test:teamamember":
      dashboard = {volunteers: team_a_members.length, teams: 1, turfs: 0, forms: 0, questions: 0, addresses: 0, dbsize: 0};
      teams = [team_a];
      break;
    case "test:teambmember":
      dashboard = {volunteers: team_b_members.length, teams: 1, turfs: 0, forms: 0, questions: 0, addresses: 0, dbsize: 0};
      teams = [team_b];
      break;
    case "test:solo":
      dashboard = {volunteers: 1, teams: 0, turfs: 0, forms: 0, questions: 0, addresses: 0, dbsize: 0};
      teams = [];
      break;
    default:
      console.warn("User not mocked: "+user.id);
  }

  // return test data based on URI
  switch (true) {
    case /dashboard/.test(uri): return dashboard;
    case /team\/list/.test(uri): return {data: teams};
    default:
      console.warn("URI not mocked: "+uri);
      break;
  }

  return {};
}
