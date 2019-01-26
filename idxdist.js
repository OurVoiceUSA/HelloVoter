/*
to run this script, do these one-time steps:

* npm install
* git clone https://github.com/OurVoiceUSA/districts.git

then:

* node node_modules/@babel/node/lib/_babel-node idxdist.js

*/

import fs from 'fs';
import wkx from 'wkx';
import {asyncForEach} from 'ourvoiceusa-sdk-js';

import { cqa } from './neo4j.js';

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

  let us_cities = JSON.parse(fs.readFileSync('./us_cities.geojson'));

  await asyncForEach(us_cities.features, async (city) => {
    if (city.geometry) {
      let wkt = wkx.Geometry.parseGeoJSON(city.geometry).toEwkt().split(';')[1];
      try {
        await cqa('create (a:District {name:{name}, geometry: {geo}, wkt: {wkt}}) with a call spatial.addNode("district", a) yield node return count(node)',
          {name: city.properties.state+' '+city.properties.city, geo: JSON.stringify(city.geometry), wkt: wkt});
      } catch (e) {console.log(e)}
    }
  });

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

