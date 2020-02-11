import React from 'react';
import { H1, Content, Body, Button, ListItem, CheckBox, Text, } from 'native-base';

import HVComponent, { HVConfirmDialog } from '../../HVComponent';

import {
  SettingsDividerShort,
  SettingsPicker,
  SettingsTextLabel,
} from 'react-native-settings-components';

import { URL_TERMS_OF_SERVICE, openURL, say, _logout, createOrgID } from '../../common';

export default class NewOrg extends HVComponent {
  constructor(props) {
    super(props);

    this.state = {
      refer: props.refer,
      ack: false,
      action: "",
      who: "",
    };

  }

  render() {
    const { refer, action, who, ack } = this.state;
    const { user } = refer.state;

    let canAddFilter = false;

    if (!user.email) return (
      <Content>
        <Text>To sign up for an OrgID, you must allow us access to your email address from your social media preferences.</Text>
        <Text></Text>
        <Text>Please sign out here, correct your email setting on your social media account, and try again.</Text>
        <Text></Text>
        <Button danger onPress={() => {
          refer.setState({newOrg: false, user: {profile: {}}});
          _logout();
        }}>
          <Text>{say("logout")}</Text>
        </Button>
      </Content>
    );

    return (
    <Content>

      <H1>{say("org_id_signup")}</H1>
      <Text></Text>
      <Text>Hello {user.name}! Before you get started, please answer a few questions about you and/or your group so HelloVoter can create an environment that best suits your organizational needs.</Text>
      <Text></Text>
      <Text>You acknowledge that as the creator of the organizational account, you'll be its administrator, and agree to our <Text style={{fontWeight: 'bold', color: 'blue'}} onPress={() => openURL(URL_TERMS_OF_SERVICE)}>
Terms of Service</Text>.
      </Text>
      <Text></Text>

      <SettingsDividerShort />

      <SettingsPicker
        title="What best describes your activities?"
        options={[
          { label: "Get-Out-The-Vote Effort", value: "GOTV" },
          { label: "Community Organizing", value: "community" },
          { label: "Ballot Initiative", value: "ballot" },
          { label: "Political Campaign", value: "political" },
          { label: "Other", value: "other" },
        ]}
        onValueChange={action => this.setState({action})}
        value={action}
        styleModalButtonsText={{ color: colors.monza }}
      />

      <SettingsDividerShort />

      <SettingsPicker
        title="Who will canvass with you?"
        options={[
          { label: "Just me", value: "me" },
          { label: "A few of my friends", value: "friends" },
          { label: "Members of my team", value: "team" },
          { label: "Anyone I can get to help!", value: "any" },
        ]}
        onValueChange={who => this.setState({who})}
        value={who}
        styleModalButtonsText={{ color: colors.monza }}
      />

      <SettingsDividerShort />

      <ListItem onPress={() => this.setState({ack: !ack})} error>
        <CheckBox checked={ack} onPress={() => this.setState({ack: !ack})} />
        <Body>
          <Text>I have read & agree to the Terms of Service</Text>
        </Body>
      </ListItem>

      <Text></Text>

      <Button block onPress={async () => {
        const { refer } = this.state;
        const { state } = refer.state;

        if (!action) return this.alert(say("incomplete_form"), say("all_required"));
        if (!who) return this.alert(say("incomplete_form"), say("all_required"));
        if (!ack) return this.alert(say("termsofservice"), say("must_agree_to_tos"));

        refer.setState({loading: true});

        let res;

        try {
          res = await createOrgID({state, action, who});
        } catch (e) {
          console.warn(e);
          refer.setState({ newOrg: false, error: true, loading: false})
          return;
        }

        if (res.status !== 200) {
          refer.setState({ newOrg: false, canvaslater: res.status, error: true, loading: false})
          return;
        }

        let json = await res.json();
        let myOrgID = json.orgid;

        refer.setState({ myOrgID, newOrg: false, loading: false }, () => {
          refer._loadForms();
          refer.sayHello('gotv-'+state.toLowerCase()+'.ourvoiceusa.org', myOrgID);
        });
      }}>
        <Text>Create Organization</Text>
      </Button>

      <Text></Text>

      <Button block danger onPress={() => refer.setState({newOrg: false})}>
        <Text>Go Back</Text>
      </Button>

      <HVConfirmDialog refer={this} />

    </Content>
    );
  }
}

const colors = {
  white: "#FFFFFF",
  monza: "#C70039",
  switchEnabled: "#C70039",
  switchDisabled: "#efeff3",
  blueGem: "#27139A",
};
