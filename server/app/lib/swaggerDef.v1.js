var p = require("../../package.json");
module.exports = {
  openapi: '3.0.0',
  info: {
    title: p.name,
    version: p.version,
    description: p.description
  },
  servers: [{
    url: '/HelloVoterHQ/{OrgID}/api/v1',
    variables: {OrgID: {default: (process.env.NODE_ENV==='production'?"":"DEV")}}
  }]
};
