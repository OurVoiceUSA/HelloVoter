import { getLocales, getTimeZone } from 'react-native-localize';
import Permissions from 'react-native-permissions';
import DeviceInfo from 'react-native-device-info';

function bystreet(a,b) {
  let na = parseInt(a.address.street.replace(/(\d+) .*/, '$1'));
  let nb = parseInt(b.address.street.replace(/(\d+) .*/, '$1'));

  if ( na < nb ) return -1;
  if ( na > nb ) return 1;
  return 0;
}

export async function permissionLocation() {
  let perm;

  if (Platform.OS === 'ios') {
    perm = Permissions.PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
  } else {
    perm = Permissions.PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
  }

  try {
    let res = await Permissions.check(perm);
    if (res === "denied") res = await Permissions.request(perm);
    if (res === "granted") return true;
  } catch (e) {
    console.warn(e);
  }

  return false;
}

export async function DINFO() {
  let locale;
  let info = {};

  try {
    let [
      ApplicationName, Brand, BuildNumber, BundleId, Carrier, DeviceId,
      DeviceName, FontScale, FreeDiskStorage, Manufacturer, Model,
      ReadableVersion, SystemName, SystemVersion, TotalDiskCapacity,
      TotalMemory, UniqueID, UserAgent, Version, Emulator, Tablet,
      hasNotch, Landscape
    ] = await Promise.all([
      DeviceInfo.getApplicationName(),
      DeviceInfo.getBrand(),
      DeviceInfo.getBuildNumber(),
      DeviceInfo.getBundleId(),
      DeviceInfo.getCarrier(),
      DeviceInfo.getDeviceId(),
      DeviceInfo.getDeviceName(),
      DeviceInfo.getFontScale(),
      DeviceInfo.getFreeDiskStorage(),
      DeviceInfo.getManufacturer(),
      DeviceInfo.getModel(),
      DeviceInfo.getReadableVersion(),
      DeviceInfo.getSystemName(),
      DeviceInfo.getSystemVersion(),
      DeviceInfo.getTotalDiskCapacity(),
      DeviceInfo.getTotalMemory(),
      DeviceInfo.getUniqueId(),
      DeviceInfo.getUserAgent(),
      DeviceInfo.getVersion(),
      DeviceInfo.isEmulator(),
      DeviceInfo.isTablet(),
      DeviceInfo.hasNotch(),
      DeviceInfo.isLandscape(),
    ]);

    info.ApplicationName = ApplicationName;
    info.Brand = Brand;
    info.BuildNumber = BuildNumber;
    info.BundleId = BundleId;
    info.Carrier = Carrier;
    info.DeviceId = DeviceId;
    info.DeviceName = DeviceName;
    info.FontScale = FontScale;
    info.FreeDiskStorage = FreeDiskStorage;
    info.Manufacturer = Manufacturer;
    info.Model = Model;
    info.ReadableVersion = ReadableVersion;
    info.SystemName = SystemName;
    info.SystemVersion = SystemVersion;
    info.TotalDiskCapacity = TotalDiskCapacity;
    info.TotalMemory = TotalMemory;
    info.UniqueID = UniqueID;
    info.UserAgent = UserAgent;
    info.Version = Version;
    info.Emulator = Emulator;
    info.Tablet = Tablet;
    info.hasNotch = hasNotch;
    info.Landscape = Landscape;
  } catch (e) {
    console.warn("DeviceInfo:"+e);
  }

  // DeviceInfo used to have these ... no more. Get them from another module
  try {
    locale = getLocales()[0];
    info.Timezone = getTimeZone();
  } catch (e) {
    locale = {};
    console.warn(e);
  };

  info.DeviceCountry = locale.countryCode;
  info.DeviceLocale = locale.languageCode;

  return info;
};

export var geojson2polygons = (json, flag) => {

  // default lng/lat to short names
  let lng = "lng";
  let lat = "lat";

  // flag switches lng/lat to long names
  if (flag) {
    lng = "longitude";
    lat = "latitude";
  }

  let polygons = [];

  switch (json.type) {
    case "Polygon":
      let polygon = json.coordinates[0];
      polygons[0] = [];
      for (let g in polygon) {
        polygons[0].push({
          [lng]: polygon[g][0],
          [lat]: polygon[g][1],
        });
      }
    break;
  case "MultiPolygon":
    for (let c in json.coordinates) {
      let polygon = json.coordinates[c][0];
      polygons[c] = [];
      for (let g in polygon) {
        polygons[c].push({
          [lng]: polygon[g][0],
          [lat]: polygon[g][1],
        });
      }
    }
    break;
  }

  return polygons;
}
