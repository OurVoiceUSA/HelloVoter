/*
to run this script, do these one-time steps:

* npm install
* git clone git clone https://github.com/OurVoiceUSA/districts.git

then:

* node node_modules/@babel/node/lib/_babel-node idxdist.js

*/

import fs from 'fs';
import wkx from 'wkx';
import {asyncForEach} from 'ourvoiceusa-sdk-js';
import neo4j from 'neo4j-driver';
import BoltAdapter from 'node-neo4j-bolt-adapter';

import { ov_config } from './ov_config.js';

// async'ify neo4j
const authToken = neo4j.auth.basic(ov_config.neo4j_user, ov_config.neo4j_pass);
const db = new BoltAdapter(neo4j.driver('bolt://'+ov_config.neo4j_host, authToken));

doYerThang();

async function doYerThang() {

  let ref = await cqa('match (a {layer:{layer}})-[:LAYER]-(:ReferenceNode {name:"spatial_root"}) return count(a)', {layer: 'district'});

  // TODO: configure a MUCH lower maxNodeReferences ... 100 is too large for this
  if (ref.data[0] === 0)
    await cqa('call spatial.addWKTLayer("district", "wkt")');

  // TODO: auto get latest
  let cdyear = '2016';

  let cds = fs.readdirSync('./districts/cds/'+cdyear);
  let states = fs.readdirSync('./districts/states');

  await asyncForEach(cds, async (cd) => {
    let ref = await cqa('match (a:District {name:{name}}) return count(a)', {name: cd});
    if (ref.data[0] === 0) {
      let geo = JSON.parse(fs.readFileSync('./districts/cds/'+cdyear+'/'+cd+'/shape.geojson'));
      if (geo.geometry) geo = geo.geometry;
      let wkt = wkx.Geometry.parseGeoJSON(geo).toEwkt().split(';')[1];
      await cqa('create (a:District {name:{name}, geometry: {geo}, wkt: {wkt}}) with a call spatial.addNode("district", a) yield node return count(node)',
        {name: cd, geo: JSON.stringify(geo), wkt: wkt});
    }
  });

  await asyncForEach(states, async (state) => {
    if (state === "kml") return;

    let ref = await cqa('match (a:District {name:{name}}) return count(a)', {name: state});
    if (ref.data[0] === 0) {
      let geo = JSON.parse(fs.readFileSync('./districts/states/'+state+'/shape.geojson'));
      if (geo.geometry) geo = geo.geometry;
      let wkt = wkx.Geometry.parseGeoJSON(geo).toEwkt().split(';')[1];
      await cqa('create (a:District {name:{name}, geometry: {geo}, wkt: {wkt}}) with a call spatial.addNode("district", a) yield node return count(node)',
        {name: state, geo: JSON.stringify(geo), wkt: wkt});
    }
  });

  await asyncForEach(states, async (state) => {
    if (state === "kml") return;

    let sldl = [];

    try {
      sldl = fs.readdirSync('./districts/states/'+state+'/sldl');
    } catch (e) {console.warn(e)}

    await asyncForEach(sldl, async (dist) => {
      dist = (dist.split('.'))[0];
      let name = state+'-sldl-'+dist;
      let ref = await cqa('match (a:District {name:{name}}) return count(a)', {name: name});
      if (ref.data[0] === 0) {
        let geo = JSON.parse(fs.readFileSync('./districts/states/'+state+'/sldl/'+dist+'.geojson'));
        if (geo.geometry) geo = geo.geometry;
        let wkt = wkx.Geometry.parseGeoJSON(geo).toEwkt().split(';')[1];
        await cqa('create (a:District {name:{name}, geometry: {geo}, wkt: {wkt}}) with a call spatial.addNode("district", a) yield node return count(node)',
          {name: name, geo: JSON.stringify(geo), wkt: wkt});
      }
    });

    let sldu = [];

    try {
      sldu = fs.readdirSync('./districts/states/'+state+'/sldu');
    } catch (e) {console.warn(e)}

    await asyncForEach(sldu, async (dist) => {
      dist = (dist.split('.'))[0];
      let name = state+'-sldu-'+dist;
      let ref = await cqa('match (a:District {name:{name}}) return count(a)', {name: name});
      if (ref.data[0] === 0) {
        let geo = JSON.parse(fs.readFileSync('./districts/states/'+state+'/sldu/'+dist+'.geojson'));
        if (geo.geometry) geo = geo.geometry;
        let wkt = wkx.Geometry.parseGeoJSON(geo).toEwkt().split(';')[1];
        await cqa('create (a:District {name:{name}, geometry: {geo}, wkt: {wkt}}) with a call spatial.addNode("district", a) yield node return count(node)',
          {name: name, geo: JSON.stringify(geo), wkt: wkt});
      }
    });

  });

  process.exit(0);
}

async function dbwrap() {
    var params = Array.prototype.slice.call(arguments);
    var func = params.shift();
    if (ov_config.DEBUG) {
      let funcName = func.replace('Async', '');
      console.log('DEBUG: '+funcName+' '+params[0]+';');
      if (params[1]) {
        let str = "";
        str += JSON.stringify(params[1]);
        console.log('DEBUG: :params '+str.substring(0, 1024));
      }
    }
    return db[func](params[0], params[1]);
}

async function cqa(q, p) {
  return dbwrap('cypherQueryAsync', q, p);
}

