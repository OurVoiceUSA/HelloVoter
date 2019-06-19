
import { Docker, Options } from 'docker-cli-js';

export async function runDatabase(sandbox) {
  let docker = new Docker(new Options());
  let ni = 'neo4j-hv';
  let nc = ni+(sandbox?'-sandbox':'');

  let d;

  try {
    d = await docker.command('images');

    if (d.images.filter(i => i.repository === ni).length === 0) {
      console.log("Building the neo4j test image, this may take a few minutes.");
      await docker.command("build -t "+ni+" neo4j");
    } else {
      console.log("Using cached local build of "+ni+" image.");
    }

    d = await docker.command('ps');

    if (d.containerList.filter(i => i.names === nc).length === 0) {
      console.log("Launching a "+nc+" container.");
      try {
        await docker.command("rm -f "+nc);
      } catch (e) {}

      await docker.command("run -d -p "+(sandbox?"5":"")+"7687:7687 -p "+(sandbox?"5":"")+"7474:7474 -e NEO4J_AUTH=neo4j/"+nc+" -e NEO4J_dbms_security_procedures_unrestricted=apoc.\\\\\\\\\* --name "+nc+" "+ni);
    } else {
      console.log("Using already running "+nc+" container.");
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

}
