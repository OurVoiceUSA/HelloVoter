import React, { Component } from 'react';
import { Text, View } from '../lib/react-native';

import { STORAGE_KEY_DISCLOSURE, URL_TERMS_OF_SERVICE } from '../lib/consts';
import { Layout, Loading } from '../components';
import { Button } from '../components/Buttons';
import { Heading } from '../components/Type';
import { storage, common } from '../lib';

export default class OrgSelect extends Component {
  constructor(props) {
    super(props);

    this.state = {
      ack: false,
      refer: props.refer,
      loading: true,
      orgId: null,
    };
  }

  componentDidMount = async () => {
    const { refer } = this.state;

    const value = await storage.get(STORAGE_KEY_DISCLOSURE);
    if (value) this.setState({ack: true});

    let res = await refer.fetch('https://gotv.ourvoiceusa.org/orgid/v1/status');
    if (res.status === 200) {
      let json = await res.json();
      if (json.orgid) this.setState({orgId: json.orgid});
    }
    this.setState({loading: false});
  }

  render() {
    const { ack, loading, refer, orgId } = this.state;

    if (loading) return (<Loading />);
    if (!ack) return (
      <Layout.Root>
        <Layout.Content>
          <Layout.ViewCenter>
            <Text>
              Our Voice USA provides this app for free for you to use for your own purposes.
            </Text>

            <Layout.Space />

            <Text>
              By using this app you acknowledge that you are acting on your own behalf, do not represent Our Voice USA
              or its affiliates, and have read our <Text style={{fontWeight: 'bold', color: 'blue'}} onPress={() => common.openURL(URL_TERMS_OF_SERVICE)}>
              Terms of Service</Text>.
            </Text>

            <Layout.Space />

            <Text>Please be courteous to those you interact with.</Text>

            <Layout.Space />

            <Button onPress={() => {
              storage.set(STORAGE_KEY_DISCLOSURE, common.getEpoch().toString());
              this.setState({ack: true});
            }} error>
                <Text>I have read & agree to the Terms of Service</Text>
            </Button>

            <Layout.Space />

            <Button block danger onPress={() => refer.logout()}>
              <Text>I do not agree, Exit</Text>
            </Button>
          </Layout.ViewCenter>
        </Layout.Content>
      </Layout.Root>
    );

    let orgs = ["DEMO"];
    if (orgId) orgs.push(orgId);

    return (
      <Layout.Root>
        <Layout.Content>
          <Layout.ViewCenter>
            <Heading>Select an Organization</Heading>

            {orgs.map(orgId => (
              <Button key={orgId} onPress={() => refer.setOrg(orgId)}>
                <Text>Enter {orgId}</Text>
              </Button>
            ))}
          </Layout.ViewCenter>
        </Layout.Content>
      </Layout.Root>
    );
  }
}
