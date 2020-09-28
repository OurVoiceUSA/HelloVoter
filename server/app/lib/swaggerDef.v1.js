var p = require("../../package.json");

function deepCopy(o) {return JSON.parse(JSON.stringify(o))}

var error = {type: 'boolean'};
var msg = {type: 'string'};

// object IDs
var id  = {type: 'string'};
var formId = {type: 'string'};
var personId = {type: 'string'};
var deviceId = {type: 'string'};
var addressId = {type: 'string'};
var attributeId = {type: 'string'};
var turfId = {type: 'string'};
var formId = {type: 'string'};
var importId = {type: 'string'};
var type = {type: 'string'};
var apikey = {type: 'string'};

// strings
var name = {type: 'string'};
var value = {type: 'string'};
var note = {type: 'string'};
var filename = {type: 'string'};
var phone = {type: 'string'};
var address = {type: 'string'};
var street = {type: 'string', example: '1 Rocket Rd'};
var unit = {type: 'string', example: '103'};
var city = {type: 'string', example: 'Hawthorn'};
var state = {type: 'string', example: 'CA'};
var zip = {type: 'string', example: '90250'};
var inviteCode = {type: 'string'};

// integer types
var status = {type: 'integer', enum: [0,1,2,3]};
var timestamp = {type: 'integer'};
var start = {type: 'integer'};
var end = {type: 'integer'};
var limit = {type: 'integer'};
var dist = {type: 'integer'};
var count = {type: 'integer', example: 10};

// misc objects
var object = {type: 'object'};
var dinfo = {type: 'object'};
var empty = {type: 'object'};
var geometry = {type: 'object'};
var data = {type: 'array', items: 'string'};
var options = {type: 'array', items: 'string'};
var attributes = {type: 'array', items: 'object'};
var settings = {type: 'array', items: 'object'};
var volunteers = {type: 'array', items: 'object'};
var forms = {type: 'array', items: 'object'};
var persons = {type: 'array', items: 'object'};

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
    description: p.description,
    termsOfService: 'https://raw.githubusercontent.com/OurVoiceUSA/HelloVoter/develop/docs/Terms-of-Service.md',
    license: { name: p.license },
    externalDocs: {
      description: 'Find out more',
      url: 'https://github.com/OurVoiceUSA/HelloVoter/tree/develop/docs',
    }
  },
  servers: [{url: '/api/v1'}],
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
      empty: { type: 'object' },
      msg: { type: 'object', properties: { msg } },
      id: { type: 'object', properties: { id } },
      name: { type: 'object', properties: { name } },
      value: { type: 'object', properties: { value } },
      note: { type: 'object', properties: { note } },
      filename: { type: 'object', properties: { filename } },
      apikey: { type: 'object', properties: { apikey } },
      options: { type: 'object', properties: { options } },
      object:  { type: 'object', properties: { object } },
      attributes: { type: 'object', properties: { count, attributes } },
      settings: { type: 'object', properties: { settings } },
      volunteers: { type: 'object', properties: { count, volunteers } },
      forms: { type: 'object', properties: { count, forms } },
      persons: { type: 'object', properties: { count, persons } },
      data: { type: 'object', properties: { data } },
      dinfo: { type: 'object', properties: { dinfo } },
      formId: { type: 'object', properties: { formId } },
      importId: { type: 'object', properties: { importId } },
      attributeId: { type: 'object', properties: { attributeId } },
      turfId: { type: 'object', properties: { turfId } },
      formId: { type: 'object', properties: { formId } },
      geometry: { type: 'object', properties: { geometry } },
      type: { type: 'object', properties: { type } },
      longitude: { type: 'object', properties: { longitude } },
      latitude: { type: 'object', properties: { latitude } },
      inviteCode: { type: 'object', properties: { inviteCode } },
      personId: { type: 'object', properties: { personId } },
      phone: { type: 'object', properties: { phone } },
      status: { type: 'object', properties: { status } },
      start: { type: 'object', properties: { start } },
      end: { type: 'object', properties: { end } },
      deviceId: { type: 'object', properties: { deviceId } },
      addressId: { type: 'object', properties: { addressId } },
      unit: { type: 'object', properties: { unit } },
      timestamp: { type: 'object', properties: { timestamp } },
      address: { type: 'object', properties: { address } },
      street: { type: 'object', properties: { street } },
      city: { type: 'object', properties: { city } },
      state: { type: 'object', properties: { state } },
      zip: { type: 'object', properties: { zip } },
    },
  },
  security: [{BearerAuth: []}],
};
