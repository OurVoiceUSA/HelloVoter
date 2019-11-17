import React from 'react';
import { View } from 'react-native';
import { Container, Content, Text, Spinner } from 'native-base';

import HVComponent from '../HVComponent';
import TermsDisclosure, { loadDisclosure } from '../TermsDisclosure';

import { DINFO, api_base_uri, _getApiToken, bbox_usa } from '../common';

import storage from 'react-native-storage-wrapper';
import KeepAwake from 'react-native-keep-awake';
import { sleep } from 'ourvoiceusa-sdk-js';
import base64 from 'base64-js';
import pako from 'pako';

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

  if (!store.nodes) store.nodes = {};

  return store.nodes;
}

export default class App extends HVComponent {

  constructor(props) {
    super(props);

    this.state = {
      refer: props.navigation.state.params.refer,
      state: props.navigation.state.params.state,
      user: props.navigation.state.params.user,
      showDisclosure: null,
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
      .then(i => this.setState({UniqueID: i.UniqueID}, () => loadDisclosure(this)))
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

  doLegacyConversion = async () => {
    const { state, user, UniqueID } = this.state;

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

      forms_local.forEach(async (f) => {
        // sometimes this is null
        if (!f) return;

        // TODO: create attributes
        f.questions_order.forEach(async (qk) => {
          let q = f.questions[qk];

          // TODO: label, type
          // map a few defaults to a few defaults

          await this.sendData(orgId, '/attribute/create', {});
        });

        // create form
        let rform = await this.sendData(orgId, '/form/create', {
          name: f.name,
          attributes: [],
        });

        // assign form to self
        await this.sendData(orgId, '/form/assigned/volunteer/add', {
          formId: rform.formId,
          vId: user.id,
        });

        // convert form data to address & people data
        let nodes = _nodesFromJtxt(await storage.get('OV_CANVASS_PINS@'+f.id));

        let address_ids = Object.keys(nodes).filter(id => nodes[id].type === "address");
        let unit_ids = Object.keys(nodes).filter(id => nodes[id].type === "unit");
        let survey_ids = Object.keys(nodes).filter(id => nodes[id].type === "survey");

        address_ids.forEach(id => {
          let node = nodes[id];

          let input = {
            deviceId: UniqueID,
            formId: f.id,
            timestamp: node.created,
            longitude: node.latlng.longitude,
            latitude: node.latlng.latitude,
            street: node.address[0],
            city: node.address[1],
            state: node.address[2],
            zip: node.address[3],
          };

          this.sendData(orgId, '/address/add/location', input);
        });

        unit_ids.forEach(id => {
          let node = nodes[id];

          let input = {
            deviceId: UniqueID,
            formId: f.id,
            timestamp: node.created,
            longitude: nodes[node.parent_id].latlng.longitude,
            latitude: nodes[node.parent_id].latlng.latitude,
            unit: node.unit,
            addressId: node.parent_id,
          };

          this.sendData(orgId, '/address/add/unit', input);
        });

        survey_ids.forEach(id => {
          let node = nodes[id];

          // TODO: use mapped attributes to send survey data as visits

        });

        // TODO: remove forms_local & add orgId forms
        // storage.del('OV_CANVASS_PINS@'+f.id);

      });

      // we're done - go back
      // this.goBack();
    } catch (e) {
      this.setState({error: true});
    }
  }

  render() {
    const { navigate } = this.props.navigation;
    const { showDisclosure, error } = this.state;

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
            <Text>There was an error. Please try again later.</Text>
          ||
          <View>
            <Text>Converting data format, this may take a few minutes. Please do not close the app while this loads. This conversion only needs to happen one time.</Text>
            <Spinner />
          </View>
          }
        </Content>
        <KeepAwake />
      </Container>
    );
  }
}
