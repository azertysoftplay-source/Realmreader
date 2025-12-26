import React from "react";
import { View, Button, Alert } from "react-native";
import { useRealm } from "@realm/react";
import RNFS from "react-native-fs";
import DocumentPicker from "react-native-document-picker";
import RNRestart from "react-native-restart";
import { flags } from "realm";

export default function RestoreRealmScreen() {
  const realm = useRealm();

  async function restoreRealm() {
    try {
      const pick = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles],
      });

      const selectedPath = pick.uri.replace("file://", "");
      const realmPath = realm.path;

      // REQUIRED to allow closing & replacing the DB
      flags.ALLOW_CLEAR_TEST_STATE = true;

      // 1️⃣ Close current Realm instance
      realm.close();

      // 2️⃣ Replace database file
      await RNFS.unlink(realmPath).catch(() => {});
      await RNFS.copyFile(selectedPath, realmPath);

      // 3️⃣ Restart App so RealmProvider loads the new file
      RNRestart.restart();
    } catch (e: any) {
      Alert.alert("IMPORT ERROR", e.toString());
    }
  }

  return (
    <View>
      <Button title="Import Realm" onPress={restoreRealm} />
    </View>
  );
}
