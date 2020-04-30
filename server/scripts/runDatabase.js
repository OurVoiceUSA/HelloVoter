import { Docker, Options } from 'docker-cli-js';
import { runDatabase } from './lib/utils';

let docker = new Docker(new Options());

runDatabase({
  docker,
  sandbox: false,
  config: {
    pagecache_size: process.env.NEO4J_dbms_memory_pagecache_size,
    heap_size_init: process.env.NEO4J_dbms_memory_heap_initial__size,
    heap_size_max: process.env.NEO4J_dbms_memory_heap_max__size,
  },
});

