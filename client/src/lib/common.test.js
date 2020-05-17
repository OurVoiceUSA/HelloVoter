import { expect } from 'chai';
import fs from 'fs';

import { STORAGE_KEY_JWT } from './consts';
import { Platform } from './react-native';
import * as storage from './storage';
import * as common from './common';

describe('common.js as ###OS###', function () {

  before(async () => {
    Platform.setOS('###OS###');
  });

  after(async () => {
  });

  it('localaddress is correct', async () => {
    let addr = common.localaddress();
    switch (Platform.OS) {
      case 'android': expect(addr).to.equal('10.0.2.2'); break;
      default: expect(addr).to.equal('localhost'); break;
    }
  });

  // TODO: common.openURL(url, external)
  // TODO: common.openGitHub(repo);
  // TODO: common.openDonate()

  it('_getApiToken with no token', async () => {
    expect(await common._getApiToken()).to.equal("of the one ring");
  });

  it('_getApiToken with token', async () => {
    await storage.set(STORAGE_KEY_JWT, 'foo');
    expect(await common._getApiToken()).to.equal('foo');
  });

  it('api_base_uri', async () => {
    expect(common.api_base_uri()).to.equal('/api/v1');
  });

  it('api_base_uri with OrgID', async () => {
    expect(common.api_base_uri('DEMO')).to.equal('/DEMO/api/v1');
  });

  it('getEpoch is a large integer', async () => {
    expect(common.getEpoch()).to.be.above(1588610882000);
  });

  it('ingeojson not a polygon', async () => {
    expect(common.ingeojson({}, -118.3281370, 33.9208231)).to.be.equal(false);
  });

  it('ingeojson Polygon true', async () => {
    expect(common.ingeojson(JSON.parse(fs.readFileSync("../server/geojson/CA-sldl-62.geojson")).geometry, -118.3281370, 33.9208231)).to.be.equal(true);
  });

  it('ingeojson Polygon false', async () => {
    expect(common.ingeojson(JSON.parse(fs.readFileSync("../server/geojson/CA-sldl-62.geojson")).geometry, 0, 0)).to.be.equal(false);
  });

  it('ingeojson MultiPolygon true', async () => {
    expect(common.ingeojson(JSON.parse(fs.readFileSync("./src/lib/ocd-division/country/us/state/ca/shape.json")), -118.3281370, 33.9208231)).to.be.equal(true);
  });

  it('ingeojson MultiPolygon false', async () => {
    expect(common.ingeojson(JSON.parse(fs.readFileSync("./src/lib/ocd-division/country/us/state/ca/shape.json")), 0, 0)).to.be.equal(false);
  });

  it('getUSState', async () => {
    expect(common.getUSState({longitude: -118.3281370, latitude: 33.9208231})).to.be.equal('CA');
  });

  it('getUSState outisde USA', async () => {
    expect(common.getUSState({longitude: 0, latitude: 0})).to.be.equal(undefined);
  });

});
