/* eslint-disable no-mixed-operators */
import React, { Component } from 'react';
import { Text } from '../lib/react-native';

import { Camera, Layout, Loading } from '../components';
import { Button } from '../components/Buttons';
import { Heading } from '../components/Type';
import { isOnlyNative } from '../lib/common';

export default class OrgSelect extends Component {
  constructor(props) {
    super(props);

    this.state = {
      ack: false,
      refer: props.refer,
      showCamera: false,
      loading: true,
      orgId: null,
    };
  }

  componentDidMount = async () => {
    const { refer } = this.state;

    let res = await refer.fetch('https://gotv.ourvoiceusa.org/orgid/v1/status');
    if (res.status === 200) {
      let json = await res.json();
      if (json.orgid) this.setState({orgId: json.orgid});
    }
    this.setState({loading: false});
  }

  render() {
    const { loading, refer, showCamera, orgId } = this.state;

    if (loading) return (<Loading />);

    let orgs = ["DEMO"];
    if (orgId) orgs.push(orgId);

    if (showCamera) return (<Camera refer={this} />);

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

            {isOnlyNative()&&
              <Button onPress={() => this.setState({showCamera: true})}>
                <Text>Scan QRCode</Text>
              </Button>
            }

          </Layout.ViewCenter>
        </Layout.Content>
      </Layout.Root>
    );
  }
}
