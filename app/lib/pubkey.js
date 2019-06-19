
import fs from 'fs';
import fetch from 'node-fetch';

import { ov_config } from './ov_config.js';

export var public_key;
export var jwt_iss = ov_config.jwt_iss;

if (ov_config.jwt_pub_key) {
  public_key = fs.readFileSync(ov_config.jwt_pub_key, "utf8");
} else {
  console.log("JWT_PUB_KEY not defined, attempting to fetch from "+ov_config.sm_oauth_url+'/pubkey');
  fetch(ov_config.sm_oauth_url+'/pubkey')
  .then(res => {
    jwt_iss = res.headers.get('x-jwt-iss');
    if (res.status !== 200) throw "http code "+res.status;
    return res.text()
  })
  .then(body => {
    public_key = body;
  })
  .catch((e) => {
    console.log("Unable to read SM_OAUTH_URL "+ov_config.sm_oauth_url);
    console.log(e);
    process.exit(1);
  });
}

