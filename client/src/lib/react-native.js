// stubs for mocha execution

const { ActivityIndicator, Text, TouchableOpacity, View, SideMenu, css } = {};

class MockedPlatform {
  OS = 'node';
  setOS = (val) => {this.OS = val};
}

const Platform = new MockedPlatform();

const Linking = {
  addEventListener: async () => {},
  getInitialURL: async () => {},
};

const styled = {
  Text: () => {},
  View: () => {},
  SafeAreaView: () => {},
};

export { ActivityIndicator, Linking, Platform, Text, TouchableOpacity, View, SideMenu, styled, css };
