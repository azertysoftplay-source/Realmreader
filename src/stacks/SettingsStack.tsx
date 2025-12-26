import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SettingsScreen from '../screens/SettingsScreen';
import SettingsAdvanced from '../screens/SettingsAdvanced';
import BackupRealmScreen from '../screens/BackupRealmScreen';
import RestoreRealmScreen from '../screens/RestoreRealmScreen';

export type SettingsStackParamList = {
  SettingsMain: undefined;
  SettingsAdvanced: undefined;
  BackupRealm: undefined;
  RestoreRealm: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  return (
    <Stack.Navigator id="SettingsStack">
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="SettingsAdvanced" component={SettingsAdvanced} />
      <Stack.Screen name="BackupRealm" component={BackupRealmScreen} />
<Stack.Screen name="RestoreRealm" component={RestoreRealmScreen} />
    </Stack.Navigator>
  );
}
