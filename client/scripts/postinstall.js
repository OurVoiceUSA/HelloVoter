
import fs from 'fs';
import RBush from 'rbush';
import bbox from 'geojson-bbox';

let state_path = './src/lib/ocd-division/country/us/state';
var tree = new RBush();

postInstall();

function postInstall() {

  fs.readdirSync(state_path).forEach(state => {
    let geo = JSON.parse(fs.readFileSync(state_path+'/'+state+'/shape.json'));
    if (geo.geometry) geo = geo.geometry;
    let bb = bbox(geo);
    let obj = {minX: bb[0], minY: bb[1], maxX: bb[2], maxY: bb[3], state: state};
    tree.insert(obj);
  });

  fs.writeFileSync('./src/lib/rtree.json', JSON.stringify(tree.toJSON()));
  console.log("Wrote rtree.json");
}

