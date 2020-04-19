var p = require("../../package.json");

function deepCopy(o) {return JSON.parse(JSON.stringify(o))}

var error = {type: 'boolean'};
var msg = {type: 'string'};
var formId = {type: 'string'};

var err = {
  type: 'object',
  properties: {
    code: {
      type: 'integer',
    },
    error,
    msg
  }
};

var err400 = deepCopy(err);
err400.properties.code.example = 400;
err400.properties.msg.example = "Bad Request";

var err403 = deepCopy(err);
err403.properties.code.example = 403;
err403.properties.msg.example = "Forbidden";

var longitude = {
  type: 'integer',
  format: 'float',
  example: -118.3281370
};

var latitude = {
  type: 'integer',
  format: 'float',
  example: -118.3281370
};

module.exports = {
  openapi: '3.0.3',
  info: {
    title: p.name,
    version: p.version,
    description: p.description
  },
  servers: [{
    url: '/HelloVoterHQ/{OrgID}/api/v1',
    variables: {OrgID: {default: (process.env.NODE_ENV==='production'?"":"DEV")}}
  }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: "JWT"
      }
    },
    schemas: {
      err400,
      err403,
      formId_long_lat: {
        type: 'object',
        properties: { formId, longitude, latitude }
      }
    }
  },
  security: [{BearerAuth: []}]
};
