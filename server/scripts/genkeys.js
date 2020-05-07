import keypair from 'keypair';
import fs from 'fs';
import { genkeys } from './lib/utils';

genkeys({fs, keypair});
