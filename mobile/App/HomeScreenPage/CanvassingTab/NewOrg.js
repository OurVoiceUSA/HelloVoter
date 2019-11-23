import React, { PureComponent } from 'react';
import { View } from 'react-native';
import { Content, Body, Button, ListItem, CheckBox, Text, } from 'native-base';

import HVComponent, { HVConfirmDialog } from '../../HVComponent';

import {
  SettingsDividerShort,
  SettingsDividerLong,
  SettingsCategoryHeader,
  SettingsPicker,
  SettingsTextLabel,
} from 'react-native-settings-components';

import { say, createOrgID } from '../../common';

export default class NewOrg extends HVComponent {
  constructor(props) {
    super(props);

    this.state = {
      refer: props.refer,
      form: props.form,
      ack: false,
      action: "",
      who: "",
    };

  }

  render() {
    const { refer, action, who, ack } = this.state;

    let canAddFilter = false;

    return (
    <Content>

      <SettingsCategoryHeader title={say("org_id_signup")} />

      <SettingsDividerLong />

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
          refer.setState({ newOrg: false, error: true, loading: false})
          return;
        }

        let json = await res.json();
        let myOrgID = json.orgid;

        refer.setState({ myOrgID, newOrg: false, loading: false });
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
