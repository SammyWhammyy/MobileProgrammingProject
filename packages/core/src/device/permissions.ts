import { PermissionsAndroid, Platform, type Permission } from 'react-native';

export type PermissionResult = {
  allGranted: boolean;
  denied: string[];
};

export async function requestScanPermissions(): Promise<PermissionResult> {
  if (Platform.OS !== 'android') return { allGranted: true, denied: [] };

  const P = PermissionsAndroid.PERMISSIONS;
  const wanted: Permission[] = [P.ACCESS_FINE_LOCATION, P.ACCESS_COARSE_LOCATION];
  if (Platform.Version >= 31) wanted.push(P.BLUETOOTH_SCAN, P.BLUETOOTH_CONNECT);
  if (Platform.Version >= 33) wanted.push(P.NEARBY_WIFI_DEVICES);

  const result = await PermissionsAndroid.requestMultiple(wanted);
  const denied = wanted
    .filter((p) => result[p] !== PermissionsAndroid.RESULTS.GRANTED)
    .map((p) => p.replace('android.permission.', ''));
  return { allGranted: denied.length === 0, denied };
}
