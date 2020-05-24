import React, { Component } from 'react';
import { Text } from '../lib/react-native';

import * as Layout from '../components/Layout';
import { Button } from '../components/Buttons';
import { Heading } from '../components/Type';
import Loading from '../components/Loading';

export default class OrgSelect extends Component {
  constructor(props) {
    super(props);

    this.state = {
      refer: props.refer,
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
    const { loading, refer, orgId } = this.state;

    if (loading) return (<Loading />);

    let orgs = ["DEMO"];
    if (orgId) orgs.push(orgId);

    return (
      <Layout.Root>
        <Layout.Content>
          <Heading>Select OrgID</Heading>
          <Layout.ViewCenter>
            {orgs.map(orgId => (
              <Button key={orgId} onPress={() => refer.setOrg(orgId)}>
                <Text>{orgId}</Text>
              </Button>
            ))}
            <Layout.Space />
          </Layout.ViewCenter>
        </Layout.Content>
      </Layout.Root>
    );
  }
}
