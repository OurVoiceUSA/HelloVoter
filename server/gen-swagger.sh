#!/bin/bash

set -e
./node_modules/swagger-jsdoc/bin/swagger-jsdoc.js -d ./app/lib/swaggerDef.v1.js $(find app/routes/api/v1 | grep -v test.js | grep '\.js$' | sort)  -o ./app/swagger.v1.json

