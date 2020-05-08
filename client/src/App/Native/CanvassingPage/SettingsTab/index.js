import React from 'react';
import { View } from 'react-native';
import { Content, Text, } from 'native-base';
import HVComponent, { HVConfirmDialog } from '../../HVComponent';

import {
  SettingsDividerShort,
  SettingsDividerLong,
  SettingsCategoryHeader,
  SettingsButton,
  SettingsSwitch,
  SettingsPicker,
} from "react-native-settings-components";

import { WalkthroughElement } from 'react-native-walkthrough';

import { say, makeTooltipContent } from '../../common';

var size_matters = [
  { size: 100, label: "small", value: "small" },
  { size: 250, label: "medium", value: "medium" },
  { size: 500, label: "large", value: "large" },
];

function limit2size(obj) {
  if (!obj || !obj.limit) return "small";
  let arr = size_matters.filter(m => m.size === obj.limit);
  if (!arr || !arr.length) return "small";
  return arr[0].label;
}

export const walkthroughSettings = [
  {
    id: 'start-settings-walkthrough',
    content: makeTooltipContent("This is Settings. Tap the screen to move onto the next tooltip of this brief walkthrough."),
    tooltipProps: {allowChildInteraction: false},
  },
  {
    id: 'auto-reload',
    content: makeTooltipContent("Automatically refresh the pins each time you move the map. WARNING: Enabling this increases your cellular data and battery power consumption!"),
    tooltipProps: {allowChildInteraction: false, placement: 'bottom'},
  },
  {
    id: 'limit-addresses',
    content: makeTooltipContent("The volume of address pins that load at a given time. The more that load at once, the slower the app will get."),
    tooltipProps: {allowChildInteraction: false},
  },
  {
    id: 'hide-already-contacted',
    content: makeTooltipContent("Don't show people who have already been visisted by someone for this form."),
    tooltipProps: {allowChildInteraction: false},
  },
  {
    id: 'filter-by-attributes',
    content: makeTooltipContent("To help you further target your canvassing, enabling this will make the map only show addresses with people who match your selected criteria below."),
    tooltipProps: {allowChildInteraction: false},
  },
];

export default class SettingsTab extends HVComponent {
  constructor(props) {
    super(props);

    this.state = {
      refer: props.refer,
      form: props.form,
    };
  }

  changeSetting(name, value) {
    const { refer } = this.state;
    let { canvassSettings } = refer.state;

    canvassSettings[name] = value;

    if (name === 'pin_auto_reload' && value === true) this.changeSetting('limit', 100);

    refer.setState({canvassSettings});
    this.forceUpdate();
  }

  render() {
    const { refer } = this.state;

    let canAddFilter = false;

    // if any of the filters don't have a value, don't show the add button
    if (refer.state.canvassSettings.filters && refer.state.canvassSettings.filters.length) {
      canAddFilter = true;
      refer.state.canvassSettings.filters.forEach(f => {
        if (!f.value) canAddFilter = false;
      });
    }

    let size_limit = limit2size(refer.state.canvassSettings);

    return (
    <Content>

      <SettingsCategoryHeader title={"Settings"} />

      <SettingsDividerLong />

      <WalkthroughElement id="auto-reload">
        <SettingsSwitch
          title="Auto Reload"
          onValueChange={pin_auto_reload => {
            if (pin_auto_reload) {
              this.alert(
                "Warning!",
                "Enabling this increases your cellular data and battery power consumption! Are you sure you want to enable this?",
                {
                  title: "Yes", onPress: () => {
                    this.changeSetting('pin_auto_reload', pin_auto_reload);
                    this.setState({confirmDialog: false});
                  }
                },
                {
                  title: "No", onPress: () => this.setState({confirmDialog: false}),
                }
              );
            } else {
              this.changeSetting('pin_auto_reload', pin_auto_reload);
            }
          }}
          value={refer.state.canvassSettings.pin_auto_reload}
          trackColor={{
            true: colors.switchEnabled,
            false: colors.switchDisabled,
          }}
        />
      </WalkthroughElement>

      <SettingsDividerShort />

      <WalkthroughElement id="limit-addresses">
        <SettingsPicker
          title="Limit Addresses"
          options={size_matters}
          disabled={(refer.state.canvassSettings.pin_auto_reload?true:false)}
          onValueChange={limit => this.changeSetting('limit', size_matters.filter(m => m.label === limit)[0].size)}
          value={limit2size(refer.state.canvassSettings)}
          styleModalButtonsText={{ color: colors.monza }}
        />
      </WalkthroughElement>

      <SettingsDividerShort />

      <WalkthroughElement id="hide-already-contacted">
        <SettingsSwitch
          title={"Hide already contacted"}
          onValueChange={filter_visited => this.changeSetting('filter_visited', filter_visited)}
          value={refer.state.canvassSettings.filter_visited}
          trackColor={{
            true: colors.switchEnabled,
            false: colors.switchDisabled,
          }}
        />
      </WalkthroughElement>

      <SettingsDividerShort />

      <WalkthroughElement id="filter-by-attributes">
        <SettingsSwitch
          title={"Filter Results by attribute value"}
          onValueChange={filter_pins => this.changeSetting('filter_pins', filter_pins)}
          value={refer.state.canvassSettings.filter_pins}
          trackColor={{
            true: colors.switchEnabled,
            false: colors.switchDisabled,
          }}
        />
      </WalkthroughElement>

      {refer.state.canvassSettings.filter_pins&&
      <View>
        <SettingsDividerShort />

        <FilterSwitches
          refer={this}
          filters={refer.state.canvassSettings.filters}
          attributes={this.state.form.attributes}
          />

        {canAddFilter&&
        <SettingsButton title={"Add another filter"} onPress={() => {
          this.changeSetting('filters', refer.state.canvassSettings.filters.concat([{id: '', name: '', value: ''}]));
        }} />
        }
      </View>
      }

      <HVConfirmDialog refer={this} />
    </Content>
    );
  }
}

function options_from_type(f) {
  if (!f.id) return [];

  switch (f.type) {
    case "boolean": return [
      { label: "true", value: true },
      { label: "false", value: false },
    ];
    case "string": return f.values.map(v => {
      return { label: v, value: v };
    });
    default: return [];
  }
}

const FilterSwitches = props => {
  let { attributes, filters, refer } = props;

  // no filters? create a blank one
  if (!filters || (filters && !filters.length)) filters = [{id: '', name: '', value: ''}];

  let key_options = attributes.filter(a => {

    // only certain types of attributes can be filterd on
    switch (a.type) {
      case 'boolean': break;
      case 'string': if (a.values) break; return false;
      default: return false;
    }

    // now filter by whether or not it's already found in other filters
    let found = false;
    filters.forEach((f, idx)=> {
      if (f.id === a.id && refer.state.selectedFilter !== idx) found = true;
    });

    return !found;
  }).map(a => {
    return { id: a.id, label: a.name, value: a.name };
  });

  return filters.map((filter, idx) => {

    let value_options = options_from_type(filter);

    return (
    <View key={idx}>

      <SettingsCategoryHeader
        title={"Filter #"+(idx+1)}
        textStyle={{ color: colors.monza }}
      />

      <SettingsPicker
        title={"Key"}
        dialogDescription={"Select which attribute to filter on."}
        options={key_options}
        onPress={value => {
          refer.setState({selectedFilter: idx})
        }}
        onValueChange={value => {
          attributes.forEach(a => {
            if (a.name === value) filters[idx] = a;
          });
          refer.changeSetting('filters', filters);
        }}
        value={filter.name}
        styleModalButtonsText={{ color: colors.monza }}
      />

      <SettingsPicker
        title={"Value"}
        innerTitle={filter.name}
        dialogDescription={(filter.type==="boolean"?"Select true or false.":"Select any values to match on.")}
        options={value_options}
        disabled={(value_options.length?false:true)}
        multi={(filter.type==="boolean"?false:true)}
        onValueChange={value => {
          // first one is null wtf?
          if (value[0] === null) value.splice(0, 1);

          filters[idx].value = value;
          refer.changeSetting('filters', filters);
        }}
        value={filter.value}
        styleModalButtonsText={{ color: colors.monza }}
      />

      {idx!==0&&
      <SettingsButton title={"Remove this filter"} onPress={() => {
        filters.splice(idx, 1);
        refer.changeSetting('filters', filters);
      }} />
      }

      <SettingsDividerShort />

    </View>
  )});
}

const colors = {
  white: "#FFFFFF",
  monza: "#C70039",
  switchEnabled: "#C70039",
  switchDisabled: "#efeff3",
  blueGem: "#27139A",
};
