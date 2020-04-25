var p = require("../../package.json");

function deepCopy(o) {return JSON.parse(JSON.stringify(o))}

var error = {type: 'boolean'};
var msg = {type: 'string'};
var formId = {type: 'string'};
var personId = {type: 'string'};
var phone = {type: 'string'};
var inviteCode = {type: 'string'};
var status = {type: 'integer', enum: [0,1,2,3]};
var start = {type: 'integer'};
var end = {type: 'integer'};
var limit = {type: 'integer'};
var dist = {type: 'integer'};
var dinfo = {type: 'object'};
var data = {type: 'array', items: 'string'};

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
err400.properties.msg.example = "Invalid parameter.";

var err403 = deepCopy(err);
err403.properties.code.example = 403;
err403.properties.msg.example = "Access denied to given resource.";

var longitude = {
  type: 'integer',
  format: 'float',
  example: -118.3281370
};

var latitude = {
  type: 'integer',
  format: 'float',
  example: 33.9208231
};

module.exports = {
  openapi: '3.0.3',
  info: {
    title: p.name,
    version: p.version,
    description: p.description
  },
  servers: [{url: '/HelloVoterHQ/api/v1'}],
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
      hello: {
        type: 'object',
        properties: { dinfo, longitude, latitude, inviteCode }
      },
      data: {
        type: 'object',
        properties: { msg, data }
      },
      formId: {
        type: 'object',
        properties: { formId }
      },
      longitude: {
        type: 'object',
        properties: { longitude }
      },
      latitude: {
        type: 'object',
        properties: { latitude }
      },
      inviteCode: {
        type: 'object',
        properties: { inviteCode }
      },
      poc_callresult: {
        type: 'object',
        properties: { formId, personId, phone, status, start, end }
      }
    }
  },
  security: [{BearerAuth: []}]
};
