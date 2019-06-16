
import https from 'https';
import fs from 'fs';

import { doStartupTasks } from './lib/startup';
import { doExpressInit } from './app/createExpressApp';
import { ov_config } from './lib/ov_config';
import neo4j from './lib/neo4j';
import queue from './lib/queue';

const db = new neo4j(ov_config);
const qq = new queue(db);

db.query('return timestamp()')
  .catch((e) => {
    console.error("Unable to connect to database.");
    process.exit(1)}
  ).then(async () => {
    await doStartupTasks(db, qq);

    const app = doExpressInit(true, db, qq);

    // Launch the server
    if (ov_config.server_ssl_port && ov_config.server_ssl_key && ov_config.server_ssl_cert) {
      console.log('express.js SSL startup');
      https.createServer(
        {
          key: fs.readFileSync(ov_config.server_ssl_key),
          cert: fs.readFileSync(ov_config.server_ssl_cert),
        }, app
      ).listen(ov_config.server_ssl_port);
    } else {
      const server = app.listen(ov_config.server_port, () => {
        const { address, port } = server.address();
        console.log('express.js startup');
        console.log(`Listening at http://${address}:${port}`);
      });
    }
  });
