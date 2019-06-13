
import { doExpressStartup } from './lib/express';
import { doStartupTasks } from './lib/startup';
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
    doExpressStartup(db, qq);
  });
