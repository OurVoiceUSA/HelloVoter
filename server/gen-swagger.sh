#!/bin/bash

./node_modules/swagger-jsdoc/bin/swagger-jsdoc.js -d ./app/lib/swaggerDef.v1.js $(find app/routes/api/v1 | grep -v test.js | grep '\.js$')  -o ./app/swagger.v1.json

