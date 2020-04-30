
import https from 'https';
import fs from 'fs';

import { doStartupTasks } from './lib/startup';
import { doExpressInit } from './createExpressApp';
import { hv_config } from './lib/hv_config';
import neo4j from './lib/neo4j';
import queue from './lib/queue';

const db = new neo4j(hv_config);
const qq = new queue(db);

db.query('return timestamp()')
  .catch((e) => {
    console.error("Unable to connect to database");
    console.error(e);
    process.exit(1)
  })
  .then(async () => {
    var jmx;
    try {
      jmx = _require('jmx');
    } catch (e) {
      console.warn("Unable to connect to JMX, see error below. As a result, we won't be able to optimize database queries on large sets of data, nor can we honor the JOB_CONCURRENCY configuration.");
      console.warn(e);
    }
    await doStartupTasks(db, qq, jmx);

    const app = doExpressInit(true, db, qq);

    // Launch the server
    if (hv_config.server_ssl_port && hv_config.server_ssl_key && hv_config.server_ssl_cert) {
      console.log('express.js SSL startup');
      https.createServer(
        {
          key: fs.readFileSync(hv_config.server_ssl_key),
          cert: fs.readFileSync(hv_config.server_ssl_cert),
        }, app
      ).listen(hv_config.server_ssl_port);
    } else {
      const server = app.listen(hv_config.server_port, () => {
        const { address, port } = server.address();
        console.log('express.js startup');
        console.log(`Listening at http://${address}:${port}`);
      });
    }
  });
