import React from 'react';
import { Dimensions, Text, View } from 'react-native';
import { RNCamera } from 'react-native-camera';

import { Button } from '../components/Buttons';

export default ({ refer }) => (
  <View style={{
      width: Dimensions.get('window').width,
      height: Dimensions.get('window').height,
  }}>
    <RNCamera
      ref={ref => {this.camera = ref;}}
      style={{
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}
      captureAudio={false}
      androidCameraPermissionOptions={{
        title: "Camera Permissions",
        message: "We need permission to use the camera",
        buttonPositive: "OK",
        buttonNegative: "Cancel",
      }}
      onBarCodeRead={(b) => this.parseInvite(b.data)}
      barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
    />
    <Button onPress={() => refer.setState({showCamera: false})}>
      <Text>Dismiss Camera</Text>
    </Button>
  </View>
);
