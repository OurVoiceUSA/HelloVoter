import AsyncStorage from '@react-native-community/async-storage';

export async function get(key) {
  try {
    return await AsyncStorage.getItem(key);
  } catch(e) {
  }
}

export async function set(key, val) {
  try {
    await AsyncStorage.setItem(key, val);
  } catch (e) {
  }
}

export async function del(key) {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
  }
}
