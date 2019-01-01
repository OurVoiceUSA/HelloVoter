import jwt from 'jsonwebtoken';

const sleep = m => new Promise(r => setTimeout(r, m));

export const mocked_users = [
  {value: {"id": "test:admin", "name": "Administrator", "avatar": "https://cdn0.iconfinder.com/data/icons/viking-2/500/viking_4-512.png"}, label: "Administrator"},
  {value: {"id": "test:regionleader", "name": "Team A Leader", "avatar": "https://cdn.iconscout.com/icon/premium/png-256-thumb/thor-3-159482.png"}, label: "Region Leader"},
  {value: {"id": "test:teamaleader", "name": "Team A Leader", "avatar": "https://cdn.iconscout.com/icon/premium/png-256-thumb/thor-3-159482.png"}, label: "Team A Leader"},
  {value: {"id": "test:teambleader", "name": "Team B Leader", "avatar": "https://cdn.iconscout.com/icon/premium/png-256-thumb/thor-3-159482.png"}, label: "Team B Leader"},
  {value: {"id": "test:teamamember", "name": "Team A Member", "avatar": "https://d1nhio0ox7pgb.cloudfront.net/_img/o_collection_png/green_dark_grey/256x256/plain/chess_piece_rook.png"}, label: "Team A Member"},
  {value: {"id": "test:teambmember", "name": "Team B Member", "avatar": "https://d1nhio0ox7pgb.cloudfront.net/_img/o_collection_png/green_dark_grey/256x256/plain/chess_piece_rook.png"}, label: "Team B Member"},
  {value: {"id": "test:solo", "name": "Team C Member", "avatar": "http://comic-cons.xyz/wp-content/uploads/Star-Wars-avatars-Movie-Han-Solo-Harrison-Ford.jpg"}, label: "Solo Volunteer"},
];

export async function mockFetch(token, uri, method, body) {
  // fake wait time
  await sleep(500);

  let user = jwt.decode(token);

  switch (true) {
    case /dashboard/.test(uri):
      switch (user.id) {
        case "test:admin": return {volunteers: mocked_users.length, teams: 0, turfs: 0, forms: 0, questions: 0, addresses: 0, dbsize: 0};
        case "test:regionleader": return {volunteers: mocked_users.length-1, teams: 0, turfs: 0, forms: 0, questions: 0, addresses: 0, dbsize: 0};
        default:
          console.warn("User not mocked: "+user.id+" => "+uri);
          break;
      }
      break;
    default:
      console.warn("URI not mocked: "+uri);
      break;
  }

  return {};
}
