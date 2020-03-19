
import { runDatabase } from './lib/utils';

runDatabase(true, {
  pagecache_size: 0,
  heap_size_init: 0,
  heap_size_max: 0,
});
