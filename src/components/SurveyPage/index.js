import React, { PureComponent } from 'react';
import {
  AsyncStorage,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Text,
  View,
} from 'react-native';

import Modal from 'react-native-modal';

import InfoField from '../InfoField';
import ModalInput from '../ModalInput';

export default class App extends PureComponent {
  constructor(props) {
    super(props);

    const { state } = this.props.navigation;

    this.state = {
      isModalVisible: false,
      selectedField: '',
      surveys: {},
      surveyData: [],
      asyncStorageKey: 'OV_SURVEY@'+state.params.userId,
      refer: state.params.refer,
      userId: state.params.userId,
      pinId: state.params.pinId,
      address: state.params.address,
      viewOnly: state.params.viewOnly,
    };
  }

  getSurveyData = async () => {
    const { asyncStorageKey, pinId, userId, address } = this.state;
    var fields = [];

    const surveys = {
      1: 'Our Voice',
      2: 'Woman\'s Health',
      3: 'Money in Politics',
    };

    const questions = {
      1: {sid: 1, active: 1, str: 'Income from investments should be taxed the same as all other income.'},
      2: {sid: 1, active: 1, str: 'I support a Universal Basic Income'},
      3: {sid: 1, active: 1, str: 'The banking industry bailout was an exercise in corporate welfare.'},
      4: {sid: 1, active: 1, str: 'Citizens should have access to the same level of healthcare as Members of Congress.'},
      9: {sid: 1, active: 1, str: 'Corporations should decide the value of labor without minimum wage restrictions.'},
      10: {sid: 1, active: 1, str: 'Citizens should trust Party Leaders to choose the candidates we will vote on and eliminate the primaries.'},
      11: {sid: 1, active: 1, str: 'The electoral college is necessary to keep things fair in the general Presidential election.'},
      12: {sid: 1, active: 1, str: 'Voter ID laws serve well to help control rampant voter fraud.'},
      13: {sid: 1, active: 1, str: 'We should legalize the recreational use of Marijuana.'},
      14: {sid: 1, active: 1, str: 'Only people who break the law need worry about mass surveillance.'},
      15: {sid: 1, active: 1, str: 'Privatized prison systems are the most effective tool to rehabilitate prisoners.'},
      16: {sid: 1, active: 1, str: 'Immigrants should only be allowed into the country if they share our values and beliefs.'},
      17: {sid: 1, active: 1, str: 'Abortion should be made illegal.'},
      20: {sid: 1, active: 1, str: 'The US military and its allies are responsible for increased terrorism activity.'},
      21: {sid: 1, active: 1, str: 'Negotiations are a better path to peace than war fighting efforts.'},
      22: {sid: 1, active: 1, str: 'Humanity has a responsibility to reduce pollution and leave Earth to the next generation in a better state than we received it.'},
      25: {sid: 1, active: 1, str: 'If a substance is unhealthy to breathe, then machinery shouldn\'t be allowed to release it into the atmosphere.'},
      26: {sid: 1, active: 1, str: 'As citizens of the US we have the right to access clean water.'},
      27: {sid: 1, active: 1, str: 'It is necessary for our government to regulate industry.'},
      28: {sid: 1, active: 1, str: 'Corporations should favor profits over the communities in which they operate.'},
      29: {sid: 1, active: 1, str: 'The United States of America should not have to follow International Law from the UN.'},
      30: {sid: 1, active: 1, str: 'Privatized Education such as Charter Schools or Private Universities should receive no Taxpayer Funding.'},
      31: {sid: 1, active: 1, str: 'We need stricter emissions standards to continue to cut down on pollution.'},
      32: {sid: 1, active: 1, str: 'Religion has no place in government.'},
      33: {sid: 1, active: 1, str: 'Transgender individuals deserve the right to use the restroom of the gender with which they identify.'},

      /* legacy - no longer active */
      5: {sid: 1, active: 0, str: 'Access to quality healthcare should be based on the individual\'s ability to pay for it.'},
      6: {sid: 1, active: 0, str: 'The Free Market should dictate the cost of medication in the United States.'},
      7: {sid: 1, active: 0, str: 'Our government regulating any industry is ultimately bad for everyone.'},
      8: {sid: 1, active: 0, str: 'Corporations should have no other socio economic obligations besides consistently increasing their shareholder\'s stock value.'},
      18: {sid: 1, active: 0, str: 'The Patriot Act infringes on international human rights'},
      19: {sid: 1, active: 0, str: 'The breaking of international laws and treaties, even by the United States, is never justified.'},
      23: {sid: 1, active: 0, str: 'Carbon emissions do not cause the Earth to warm abnormally.'},
      24: {sid: 1, active: 0, str: '"Clean Coal" is not beneficial to the health of the environment.'},
    };

    try {
      const data = await AsyncStorage.getItem(asyncStorageKey);

      if (data !== null) {
        json = JSON.parse(data);
        this.setState({ surveys: json });

/* rewrite this as a look through questions - intsead of survey */
        json[pinId].survey.forEach((i) => {
          // should this be skipped?
          if (questions[i.key].active === 0) { delete json[pinId].survey[i]; return;}

          // map the question string from the id
          i.field = questions[i.key].str;

          // transpose value to display string
          switch (i.value) {
          case 2:
            i.value = 'Strongly Agree';
            break;
          case 1:
            i.value = 'Agree';
            break;
          case 0:
            i.value = 'Neutral';
            break;
          case -1:
            i.value = 'Disagree';
            break;
          case -2:
            i.value = 'Strongly Disagree';
            break;
          }
        });

        this.setState({ surveyData: json[pinId].survey });
        return;
      }

    } catch (error) {
    }

    for (q in questions) {
      if (questions[q].active === 1) {
        fields.push({
          key: q,
          field: questions[q].str,
          value: '',
        });
      }
    }

    this.setState({ surveyData: fields });

  }

  saveSurveyData = async () => {
    const { asyncStorageKey, pinId, refer } = this.state;
    let { surveys, surveyData } = this.state;

    // transpose value to numeric
    surveyData.forEach((i) => {
      delete i.field; // no need to store this

      switch (i.value) {
      case 'Strongly Agree':
        i.value = 2;
        break;
      case 'Agree':
        i.value = 1;
        break;
      case 'Neutral':
        i.value = 0;
        break;
      case 'Disagree':
        i.value = -1;
        break;
      case 'Strongly Disagree':
        i.value = -2;
        break;
      }
    });

    surveys[pinId] = { survey: surveyData };

    try {
      await AsyncStorage.setItem(asyncStorageKey, JSON.stringify(surveys));
    } catch (error) {
      console.error(error);
    }

    if (refer) refer.loadSurveyData();

  }

  componentDidMount() {
    this.getSurveyData();
  }

  render() {

    const { goBack, setParams, state } = this.props.navigation;
    let { surveyData, surveys, viewOnly } = this.state;

    const HelpModal = (props) => (
      <Modal style={{
        alignItems: 'center',
        marginTop: Dimensions.get('window').height * 0.05, // temp solution for keyboard spacing
        justifyContent: 'center'}}
        isVisible={state.params.isHelpModalVisible}
      >
        <View style={{height: Dimensions.get('window').height * 0.8, width: Dimensions.get('window').width * 0.8, backgroundColor: 'white'}}>
          <Text style={{fontSize: 20, textAlign: 'center'}}>Help</Text>
          <Text style={{marginTop: 25, fontSize: 14, textAlign: 'center'}}>
            Read each statement and decide on which of the five options to select.
          </Text>
          <TouchableOpacity style={{marginTop: 25}} onPress={() => setParams({isHelpModalVisible: false})}>
            <Text style={{textAlign: 'center'}}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );

    return (
      <View style={{flex: 1, backgroundColor: 'white'}}>

        <FlatList
          data={surveyData}
          onChange={() => {this.forceUpdate()}}
          renderItem={({item}) =>
            <InfoField
              refer={this}
              title={item.field}
              value={item.value}
              isSwitch={item.switch}
              viewOnly={viewOnly}
            />
          }
          ItemSeparatorComponent={() =>
            <View style={{
                width: Dimensions.get('window').width,
                height: 1,
                backgroundColor: 'lightgray'
              }}
            />
          }
        />

        <View style={{flexDirection: 'row', alignItems: 'center'}}>
        { viewOnly != true ?
          <TouchableOpacity onPress={() => {this.saveSurveyData(); goBack();}} style={{flex: 1, backgroundColor: 'lightgray', paddingVertical: 10}}>
            <Text style={{textAlign: 'center'}}>Complete Survey</Text>
          </TouchableOpacity>
        :
          <Text></Text>
        }
        </View>

        <HelpModal />

        <Modal style={{
          alignItems: 'center',
          marginBottom: Dimensions.get('window').height * 0.2, // temp solution for keyboard spacing
          justifyContent: 'center'}}
          isVisible={this.state.isModalVisible}
        >
          <ModalInput
            survey={true}
            refer={this}
          />
        </Modal>
      </View>
    );
  }
}
