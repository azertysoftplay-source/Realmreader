import React from 'react';
import { View, Text, Button, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

export default function BackupRealmScreen() {
  const realmPath = RNFS.DocumentDirectoryPath + '/default.realm';
  const backupPath = RNFS.DocumentDirectoryPath + '/default_backup.realm';

  const backupRealm = async () => {
    try {
      const exists = await RNFS.exists(realmPath);
      if (!exists) {
        Alert.alert("Error", "Realm file not found.");
        return;
      }

      await RNFS.copyFile(realmPath, backupPath);

      await Share.open({
        url: 'file://' + backupPath,
        type: 'application/octet-stream',
        filename: 'default_backup.realm'
      });

      Alert.alert("Success", "Backup completed.");
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Backup failed.",err);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: '500', marginBottom: 20 }}>
        Backup Realm File
      </Text>

      <Button title="Create Backup" onPress={backupRealm} />
    </View>
  );
}
