import keypair from 'keypair';
import fs from 'fs';
import { Docker, Options } from 'docker-cli-js';
import { ov_config } from '../../app/lib/ov_config';

export async function runDatabase(sandbox, {pagecache_size, heap_size_init, heap_size_max}) {
  let docker = new Docker(new Options());
  let ni = 'ourvoiceusa/neo4j-hv';
  let nc = 'neo4j-hv'+(sandbox?'-sandbox':'');

  let d;

  try {
    d = await docker.command('ps');

    if (d.containerList.filter(i => i.names === nc).length === 0) {
      console.log("Launching a "+nc+" container.");
      try {
        await docker.command("rm -f "+nc);
      } catch (e) {}

      await docker.command(
        "run -d -v "+nc+":/data -p "+
        (sandbox?"5":"")+
        "7687:7687 -p "+
        (sandbox?"5":"")+
        "7474:7474 -e NEO4J_AUTH=neo4j/"+ov_config.neo4j_pass+
        (pagecache_size?" -e NEO4J_dbms_memory_pagecache_size="+pagecache_size:"")+
        (heap_size_init?" -e NEO4J_dbms_memory_heap_initial__size="+heap_size_init:"")+
        (heap_size_max?" -e NEO4J_dbms_memory_heap_max__size="+heap_size_max:"")+
        " --name "+
        nc+" "+ni
      );
    } else {
      console.log("Using already running "+nc+" container.");
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

}

export function genkeys() {
  let gen = false;

  try {
    fs.readFileSync('./test/rsa.pub');
    fs.readFileSync('./test/rsa.key');
    console.log("RSA keypair already exists, not generating a new one.");
  } catch (e) {
    gen = true;
  }

  if (gen) {
    console.log("Generating new RSA keypair...");
    var pair = keypair();
    fs.writeFileSync("./test/rsa.pub", pair.public);
    fs.writeFileSync("./test/rsa.key", pair.private);
    console.log("RSA keypair generation complete!")
  }
}
