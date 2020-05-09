import { Platform } from 'react-native';

export function localaddress() {
  return (Platform.OS === 'android'?'10.0.2.2':'localhost');
}

