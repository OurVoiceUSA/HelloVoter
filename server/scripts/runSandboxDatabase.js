import { Docker, Options } from 'docker-cli-js';
import { runDatabase } from './lib/utils';

let docker = new Docker(new Options());

runDatabase({
  docker,
  sandbox: true,
  config: {
    pagecache_size: 0,
    heap_size_init: 0,
    heap_size_max: 0,
  },
});

