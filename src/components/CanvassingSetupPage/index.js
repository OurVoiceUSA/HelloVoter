
import React, { PureComponent } from 'react';

import {
  ActivityIndicator,
  Dimensions,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

import storage from 'react-native-storage-wrapper';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Dropbox } from 'dropbox';
import { _loginPing } from '../../common';

export default class App extends PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      user: null,
      forms: [],
      dbx: null,
      connected: false,
    };

  }

  componentDidMount() {
    this._loadDBData();
  }

  _loadDBData = async () => {
    const { navigate } = this.props.navigation;
    let folders = [];
    let forms_local = [];

    this.setState({loading: true});

    let user = await _loginPing(this, false);
    let dbx = new Dropbox({ accessToken: user.dropbox.accessToken });
    let forms = [];

    // look for canvassing forms
    try {
      let res = await dbx.filesListFolder({path: ''});
      for (let i in res.entries) {
        item = res.entries[i];
        if (item['.tag'] != 'folder') continue;
        folders.push(item.path_display);
      }
      this.setState({connected: true});
    } catch (error) {
      this.setState({connected: false});
      // failed to load - look locally
      try {
        forms_local = JSON.parse(await storage.get('OV_CANVASS_FORMS'));
      } catch (error) {
      }
    };

    let pro = [];

    for (let i in folders) {
      pro.push(dbx.filesDownload({ path: folders[i]+'/canvassingform.json' }));
    }

    let objs = await Promise.all(pro.map(p => p.catch(e => e)));
    for (let i in objs) {
      try {
        item = objs[i];
        if (item.error) continue;

        let json = JSON.parse(item.fileBinary);
        json.folder_path = item.path_display.match('.*/')[0].slice(0, -1);

        forms_local.push(json);
      } catch(error) {
        // nothing to do
      }
    }

    for (let i in forms_local) {
      let json = forms_local[i];
      forms.push(
        <View key={i} style={{margin: 5, flexDirection: 'row'}}>
          <TouchableOpacity
            style={{backgroundColor: '#d7d7d7', flex: 1, padding: 10, borderRadius: 20, maxWidth: 350}}
            onPress={() => {navigate('Canvassing', {dbx: dbx, form: json, user: user})}}>
            <Text style={{fontWeight: 'bold'}}>{json.name}</Text>
            <Text style={{fontSize: 12}}>Created by {json.author}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // cache forms locally
    try {
      await storage.set('OV_CANVASS_FORMS', JSON.stringify(forms_local));
    } catch (error) {
    }

    this.setState({ loading: false, forms: forms, dbx: dbx });
  }

  render() {
    const { loading, connected, user, forms } = this.state;
    const { navigate } = this.props.navigation;

    // wait for user object to become available
    if (!user) return (
        <View style={{flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{fontSize: 20}}>Loading user data...</Text>
          <ActivityIndicator />
        </View>
      );

    if (!loading && !forms.length) {
      if (connected) forms.push(<View key={1}><Text>No Canvassing forms found in your Dropbox. Ask someone who created one to share their form with you, or create a new one.</Text></View>);
      else forms.push(<View key={1}><Text>No Canvassing forms found. Connect your device to the internet to download forms from your Dropbox.</Text></View>);
    }

    return (
      <ScrollView style={{flex: 1, backgroundColor: 'white'}} contentContainerStyle={{flexGrow:1}}>

        <View style={{margin: 20, alignItems: 'center'}}>
          <Text>You are logged into Dropbox as:</Text>
          <Text>{user.dropbox.name.display_name}</Text>
        </View>

        <View style={{
            width: Dimensions.get('window').width,
            height: 1,
            backgroundColor: 'lightgray'
          }}
        />

        <View style={{flexDirection: 'row', margin: 20, marginTop: 0}}>
            {loading &&
            <View style={{flex: 1, margin: 20, alignItems: 'center'}}>
               <Text>Loading data from Dropbox...</Text>
              <ActivityIndicator size="large" />
            </View>
            ||
            <View style={{flex: 1, alignItems: 'center'}}>
              {!connected &&
              <Text style={{margin: 10, color: '#ff0000'}}>Not connected to server.</Text>
              }
              <Text style={{margin: 10}}>Select a canvassing campaign:</Text>
              { forms }
            </View>
            }
        </View>

        {!loading && connected &&
        <View>
          <View style={{width: Dimensions.get('window').width, height: 1, backgroundColor: 'lightgray'}} />

          <View style={{margin: 12, alignItems: 'center'}}>
            <Icon.Button
              name="plus-circle"
              backgroundColor="#d7d7d7"
              color="black"
              onPress={() => navigate('CreateSurvey', {refer: this})}>
              Create Canvassing Form
            </Icon.Button>
          </View>
        </View>
        }

      </ScrollView>
    );
  }

}

