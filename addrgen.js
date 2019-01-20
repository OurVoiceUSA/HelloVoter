/*

This generates people and addresses using a random word generator,
then places the lat/lng randomly somewhere in that state's polygon.
Not meant to generate anything close to real names or addresses. I
just need a way to create lots of data that's "good enough" to test
with.

Output is a csv file where:

A random number of people live at each random address, which is
randomly a multi unit building with a random number of units,
located at a random point within said actual real state.

(reading the names/streets/cities feels like using a weegie board)

To run this script, do these one-time steps:

* npm install
* git clone https://github.com/OurVoiceUSA/districts.git

Then:

* node node_modules/@babel/node/lib/_babel-node addrgen.js

*/

import fs from 'fs';
import {asyncForEach} from 'ourvoiceusa-sdk-js';
import randomWords from 'random-words';
import randomPointsOnPolygon from 'random-points-on-polygon';

var sgeo = {};

doYerThang();

async function doYerThang() {

  let states = fs.readdirSync('./districts/states');
  states.pop(); // kml is at the end, get rid of it

  await asyncForEach(states, async (state) => {
    let geo = JSON.parse(fs.readFileSync('./districts/states/'+state+'/shape.geojson'));
    if (geo.geometry) geo = geo.geometry;

    // lazy convert to a "Feature"
    sgeo[state] = {
      type: "Feature",
      geometry: geo,
    };
  });

  let headers = 'id,name,birthday,party,street,unit,city,state,zip,lng,lat';
  let addrs = [];

  // generate a list of random addresses
  for (let i = 0; i < 100; i++) {
    let addr = {};

    let arr = randomWords(2);
    arr = arr.map(v => v = ucfirst(v));

    addr.street = getRandomInt(9999)+' '+arr[0]+' Dr';
    addr.city = arr[1]+' City';
    // hardcode to a single state, for now
    //let state = states[getRandomInt(states.length)];
    addr.state = 'UT';
    addr.zip = getRandomInt(99999);

    // random chance this is a multi unit address
    if (getRandomInt(5) === 0) {
      addr.units = [];
      for (let u = 1; u < getRandomInt(20); u++) {
        addr.units.push('Apt '+u);
      }
    }

    let point = randomPointsOnPolygon(1, sgeo[addr.state]);
    addr.lng = point[0].geometry.coordinates[0];
    addr.lat = point[0].geometry.coordinates[1];

    addrs.push(addr);
  }

  // spit to console in csv format
  console.log(headers);

  addrs.forEach(a => {
    if (a.units) a.units.forEach(u => {
      whoLivesHere(a, u);
    });
    else whoLivesHere(a, '');
  });

  process.exit(0);
}

function whoLivesHere(a, u) {
  let n = 1;
  // random chance more than one person lives here
  if (getRandomInt(3) === 0) n += getRandomInt(2);

  for (let i = 0; i < n; i++) {
    console.log(getRandomInt(9999999999)+','+randomPerson()+','+randomBirthday()+','+randomParty()+','+a.street+','+u+','+a.city+','+a.state+','+a.zip+','+a.lng+','+a.lat);
  }
}

function randomPerson() {
  let arr = randomWords(2);
  arr = arr.map(v => v = ucfirst(v));
  return arr[0]+' '+arr[1];
}

function randomBirthday() {
  let year = 1900+getRandomInt(103);
  let month = getRandomInt(13);
  let day = getRandomInt(29);
  return year+'-'+month+'-'+day;
}

function randomParty() {
  switch (getRandomInt(6)) {
    case 0: return 'Democratic';
    case 1: return 'Republican';
    case 2: return 'Libertarian';
    case 4: return 'Green';
    default: return 'No Party Preference';
  }
}

function getRandomInt(max) {
  return Math.floor(Math.random()*Math.floor(max));
}

function ucfirst(str) {
    return str.charAt(0).toUpperCase()+str.slice(1);
}

