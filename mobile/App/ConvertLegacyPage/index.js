import React from 'react';
import { View } from 'react-native';
import { Container, Content, Text, Spinner, Button, H1, H3 } from 'native-base';

import HVComponent from '../HVComponent';
import TermsDisclosure, { loadDisclosure } from '../TermsDisclosure';

import { DINFO, api_base_uri, _getApiToken, bbox_usa } from '../common';

import { asyncForEach, sleep } from 'ourvoiceusa-sdk-js';
import * as Progress from 'react-native-progress';
import storage from 'react-native-storage-wrapper';
import KeepAwake from 'react-native-keep-awake';
import promiseLimit from 'promise-limit';
import base64 from 'base64-js';
import uuidv4 from 'uuid/v4';
import pako from 'pako';
import md5 from 'md5';

var limit = promiseLimit(15);
var prog = 0;

function _nodesFromJtxt(str) {
  let store;

  try {
    store = JSON.parse(pako.ungzip(base64.toByteArray(str), { to: 'string' }));
  } catch (e) {
    try {
      store = JSON.parse(str);
    } catch (e) {
      return {};
    }
  }

  if (store === null) return {};
  if (!store.nodes) store.nodes = {};

  return store.nodes;
}

export default class App extends HVComponent {

  constructor(props) {
    super(props);

    this.state = {
      refer: props.navigation.state.params.refer,
      myPosition: props.navigation.state.params.myPosition,
      state: props.navigation.state.params.state,
      user: props.navigation.state.params.user,
      showDisclosure: null,
      progress: 0,
      total: null,
      rprogress: 0,
      rtotal: 100,
    };

    // reload forms when they go back
    this.goBack = this.props.navigation.goBack;
    this.props.navigation.goBack = () => {
      this.state.refer._loadForms();
      this.goBack();
    };
  }

  componentDidMount() {
    DINFO()
      .then(i => this.setState({dinfo: i, deviceId: i.UniqueID}, () => loadDisclosure(this)))
      .catch(() => this.setState({error: true}));
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.showDisclosure !== false && this.state.showDisclosure === false) {
      this.doLegacyConversion();
    }
  }

  sendData = async (orgId, uri, input) => {
    const { state } = this.state;
    let ret = {};

    try {
      let res = await fetch('https://gotv-'+state+'.ourvoiceusa.org'+api_base_uri(orgId)+uri, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+await _getApiToken(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (res.status !== 200) {
        throw "sendData error: "+res.status;
      }

      ret = await res.json();
    } catch (e) {
      console.warn(e);
    }

    return ret;
  }

  progup() {
    prog++;
    if (!(prog%30)) this.setState({progress: prog});
  }

  doLegacyConversion = async () => {
    const { state, user, dinfo, deviceId, myPosition } = this.state;

    for (let i = 0; i <= 100; i++)
      setTimeout(() => this.setState({rprogress: i}), 500*i)

    try {
      // get OrgID
      let res = await fetch('https://gotv-'+state+'.ourvoiceusa.org/orgid/v1/new', {
        method: 'POST',
        body: JSON.stringify({state}),
        headers: {
          'Authorization': 'Bearer '+await _getApiToken(),
          'Content-Type': 'application/json',
        },
      });

      if (res.status !== 200) throw "OrgID error";

      let json = await res.json();

      let orgId = json.orgid;

      // loop until res.status is not 418
      let retry = true;
      for (let retries = 0; (retries < 12 && retry === true); retries++) {
        let res = await fetch('https://gotv-'+state+'.ourvoiceusa.org'+api_base_uri(orgId)+'/uncle', {
          headers: {
            'Authorization': 'Bearer '+await _getApiToken(),
            'Content-Type': 'application/json',
          },
        });
        let uncle = res.json();
        if (res.status === 418) {
          // try again in 10 seconds
          await sleep(10000);
        } else {
          retry = false;
          if (res.status !== 200) throw "unexpected http code returned";
        }
      }

      if (retry) throw "tried too many times"

      // say hello!
      await this.sendData(orgId, '/hello', {
        longitude: myPosition.longitude,
        latitude: myPosition.latitude,
        dinfo,
      });

      // create turf
      let turf = await this.sendData(orgId, '/turf/create', {
        name: "Unrestricted",
        geometry: bbox_usa,
      });

      // assign self to turf
      await this.sendData(orgId, '/turf/assigned/volunteer/add', {
        turfId: turf.turfId,
        vId: user.id,
      });

      // create forms
      let forms_local = JSON.parse(await storage.get('OV_CANVASS_FORMS'));

      // default attribute ID mapping
      let aim = {
        "FullName": "013a31db-fe24-4fad-ab6a-dd9d831e72f9",
        "Phone": "7d3466e5-2cee-491e-b3f4-bfea3a4b010a",
        "Email": "b687b86e-8fe3-4235-bb78-1919bcca00db",
        "RegisteredToVote": "dcfc1fbb-4609-4900-bbb3-1c4afb2a5127",
        "PartyAffiliation": "4a320f76-ef7b-4d73-ae2a-8f4ccf5de344",
      };

      await asyncForEach(forms_local, async (f) => {
        // sometimes this is null
        if (!f) return;

        let ato = [];
        // attribute order

        // create attributes
        await asyncForEach(f.questions_order, async (qk) => {
          let q = f.questions[qk];

          // don't create duplicates
          if (aim[qk]) {
            ato.push(aim[qk]);
            return;
          }

          let d = await this.sendData(orgId, '/attribute/create', {
            name: q.label,
            type: q.type.toLowerCase(),
          });

          aim[qk] = d.attributeId;
          ato.push(d.attributeId);
        });

        // create form
        let rform = await this.sendData(orgId, '/form/create', {
          name: f.name,
          attributes: ato,
        });

        let formId = rform.formId;

        // assign form to self
        await this.sendData(orgId, '/form/assigned/volunteer/add', {
          formId: formId,
          vId: user.id,
        });

        let nodes = {};

        if (f.author_id && f.author_id.match(/^dbid:/)) {
          let res = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
            method: 'POST',
            headers: {
              "Authorization": "Bearer "+user.dropbox.accessToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              "path": f.folder_path,
              "recursive": false,
              "include_media_info": false,
              "include_deleted": false,
              "include_has_explicit_shared_members": false,
              "include_mounted_folders": true,
              "include_non_downloadable_files": true
            }),
          });

          let list = await res.json();
          let jtxts = list.entries.filter(f => f.name.match(/\.jtxt$/));
          let dn = [];

          await asyncForEach(jtxts, async (j) => {

            res = await fetch("https://content.dropboxapi.com/2/files/download", {
              method: 'POST',
              headers: {
                "Authorization": "Bearer "+user.dropbox.accessToken,
                "Dropbox-API-Arg": JSON.stringify({
                  path: f.folder_path+'/'+j.name,
                }),
              },
            });

            dn.push(_nodesFromJtxt(await res.text()));
          });

          dn.forEach(n => {
            Object.keys(n).forEach(k => {
              nodes[k] = n[k];
            });
          });
        } else {
          nodes = _nodesFromJtxt(await storage.get('OV_CANVASS_PINS@'+f.id));
        }

        // convert form data to address & people data
        this.setState({total: Object.keys(nodes).length});

        Object.keys(nodes).forEach((id) => {
          let node = nodes[id];
          // App was released in early 2018 with timestamps in seconds
          // If the timestamp is earlier than that, assume it's in seconds and convert to milliseconds
          if (node.created < 1514764801000) node.created *= 1000;
          if (node.updated < 1514764801000) node.updated *= 1000;
        });

        let address_ids = Object.keys(nodes).filter(id => nodes[id].type === "address");
        let unit_ids = Object.keys(nodes).filter(id => nodes[id].type === "unit");
        let survey_ids = Object.keys(nodes).filter(id => nodes[id].type === "survey");

        await limit.map(address_ids, async (id) => {
          let node = nodes[id];

          if (!node.address) return;
          if (!node.latlng) return;
          if (!node.address[0]) node.address[0] = "";
          if (!node.address[1]) node.address[1] = "";
          if (!node.address[2]) node.address[2] = "";
          if (!node.address[3]) node.address[3] = "";

          node.rid = md5(node.address[0].toLowerCase()+node.address[1].toLowerCase()+node.address[2].toLowerCase()+node.address[3].substr(0, 5));

          await this.sendData(orgId, '/address/add/location', {
            deviceId,
            formId,
            timestamp: (node.created?node.created:node.updated),
            longitude: node.latlng.longitude,
            latitude: node.latlng.latitude,
            street: node.address[0],
            city: node.address[1],
            state: node.address[2],
            zip: node.address[3],
          });
          this.progup();
        });

        await limit.map(unit_ids, async (id) => {
          let node = nodes[id];
          if (!nodes[node.parent_id]) return;
          if (!nodes[node.parent_id].latlng) return;
          await this.sendData(orgId, '/address/add/unit', {
            deviceId,
            formId,
            timestamp: (node.created?node.created:node.updated),
            longitude: nodes[node.parent_id].latlng.longitude,
            latitude: nodes[node.parent_id].latlng.latitude,
            unit: node.unit,
            addressId: nodes[node.parent_id].rid,
          });
          this.progup();
        });

        await limit.map(survey_ids, async (id) => {
          let node = nodes[id];
          let status;
          let addressId;

          // if unit, get the unit's parent_id
          let unit;
          try {
            if (nodes[node.parent_id].rid) addressId = nodes[node.parent_id].rid;
            else {
              addressId = nodes[nodes[node.parent_id].parent_id].rid;
              unit = nodes[node.parent_id].unit;
            }
          } catch (e) {
            addressId = node.id;
          }

          switch (node.status) {
            case 'home': status = 1; break;
            case 'not interested': status = 2; break;
            default: status = 0; break;
          }

          // if not "home", send the status and bail
          if (status === 0 || status === 2) {
            let input = {
              deviceId,
              addressId,
              formId,
              status,
              start: node.created,
              end: node.updated,
              longitude: myPosition.longitude,
              latitude: myPosition.latitude,
            };

            if (unit) input.unit = unit;

            await this.sendData(orgId, '/people/visit/update', input);
            this.progup();
            return;
          }

          let attrs = [];

          Object.keys(aim).forEach(qk => {
            if (node.survey && node.survey[qk]) {
              attrs.push({
                id: aim[qk],
                value: node.survey[qk],
              });
            }
          });

          let input = {
            deviceId,
            addressId,
            formId,
            status,
            start: node.created,
            end: node.updated,
            longitude: myPosition.longitude,
            latitude: myPosition.latitude,
            personId: uuidv4(),
            attrs,
          };

          if (unit) input.unit = unit;

          await this.sendData(orgId, '/people/visit/add', input);
          this.progup();
        });

        // TODO: remove forms_local & add orgId forms
        // storage.del('OV_CANVASS_PINS@'+f.id);

      });

      // we're done - go back
      this.goBack();
    } catch (e) {
      console.warn(e);
      this.setState({error: true});
    }
  }

  render() {
    const { navigate } = this.props.navigation;
    const { showDisclosure, error, progress, total, rprogress, rtotal } = this.state;

    // initial render
    if (showDisclosure === null) {
      return (
        <Container>
          <Content>
            <Spinner />
          </Content>
        </Container>
      );
    } else if (showDisclosure) {
      return (<TermsDisclosure refer={this} />);
    }

    return (
      <Container>
        <Content padder>
          {error&&
            <Text>There was an error. Please close the app and try again later.</Text>
          ||
          <View>
            <View style={{flex: 1, alignItems: 'center'}}>
              <H1>Update in Progress</H1>
            </View>
            <Text></Text>
            <Text>Thanks for using our App! This update brings a ton of new features that we hope you will find useful. Please do not close the app while this loads. This only needs to happen one time.</Text>
            <Text></Text>
            <View style={{flex: 1, alignItems: 'center'}}>
              <H3>Update {(total?"Received":"Requested")}</H3>
              <Text></Text>
              <Progress.Circle progress={(total?1:(rtotal?rprogress/rtotal:0))} showsText={true} size={180} thickness={3} indeterminate={(rprogress===rtotal?(total?false:true):false)} borderWidth={3} color={'red'} />
              <Text></Text>
              <H3>Update Progress</H3>
              <Text></Text>
              <Progress.Circle progress={(total?progress/total:0)} showsText={true} size={180} thickness={4} indeterminate={false} borderWidth={4} />
            </View>
          </View>
          }
        </Content>
        <KeepAwake />
      </Container>
    );
  }
}
