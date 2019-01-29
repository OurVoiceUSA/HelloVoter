
import { cqa } from './lib/neo4j.js';
import { doStartupTasks } from './lib/startup.js';
import { doExpressStartup } from './lib/express.js';

cqa('return timestamp()')
  .catch((e) => {
    console.error("Unable to connect to database.");
    process.exit(1)}
  ).then(async () => {
    await doStartupTasks();
    doExpressStartup();
  });

