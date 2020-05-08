import { Platform } from 'react-native';
import config from 'react-native-config';

export const wsbase = config.WS_BASE;
export const google_api_key = (Platform.OS === 'ios'?config.GOOGLE_API_KEY_IOS:config.GOOGLE_API_KEY_ANDROID);
export const android_cert = (Platform.OS === 'ios'?'':config.ANDROID_CERT);

