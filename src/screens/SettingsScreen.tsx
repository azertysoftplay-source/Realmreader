import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, Button, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../stacks/SettingsStack';
import i18n from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from "../theme";
import auth from "@react-native-firebase/auth";
import { useRealm, useQuery } from '@realm/react';
import migrateClientsToFirestore from '../helpers/realmFirestoreSync';
import migrateFirestoreToRealm from '../helpers/firestoreToRealmSync';

type Props = NativeStackScreenProps<SettingsStackParamList, "SettingsMain">;

export default function SettingsScreen({ navigation }: Props) {
  const realm = useRealm();
  // We check if the database is empty to suggest a restore
  const clients = useQuery('Clients_details'); 
  
  const { theme,isDark, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMigrating, setIsMigrating] = useState(false);
  const [lang, setLang] = useState(i18n.language);
  // 1. Auto-check for empty database on mount
  useEffect(() => {
    if (clients.length === 0 && !isMigrating && !loading) {
      console.log("Empty Realm detected for this user.");
    }
  }, [clients.length]);
    useLayoutEffect(() => {
      navigation.setOptions({
        title:  i18n.t("tabbar.text_account"),
        headerStyle: {
          backgroundColor: theme.card,
        },
        headerTintColor: theme.text,
       
      });
    }, [navigation, theme,i18n.language]);

  const changeLang = async (value: string) => {
    await AsyncStorage.setItem('appLang', value);
    i18n.changeLanguage(value);
    setLang(value);
  };

  const handleRestore = async () => {
    const user = auth().currentUser;
    if (!user) return Alert.alert('Error', 'Sign in first');

    setLoading(true);
    try {
      await migrateFirestoreToRealm(realm, user);
      Alert.alert('Success', 'Local database updated from cloud');
    } catch (e: any) {
      Alert.alert('Restore Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    const user = auth().currentUser;
    if (!user) {
      Alert.alert("Authentication Required", "You must be logged in to sync data.");
      return;
    }

    setIsMigrating(true);
    setProgress(0);

    try {
      await migrateClientsToFirestore(realm, user, (p) => {
        setProgress(p);
      });
      Alert.alert("Success", "All data has been synced to the cloud!");
    } catch (error: any) {
      console.error(error);
      Alert.alert("Sync Failed", error.message);
    } finally {
      setIsMigrating(false);
      setProgress(0);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#f5f5f5' }]}>
      
      <Text style={[styles.header, { color: isDark ? '#fff' : '#333' }]}>
        {i18n.t("account.text_setting")}
      </Text>

      {/* --- Cloud Sync Card --- */}
    <View style={[styles.card, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
  <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
    {i18n.t("cloud.title")}
  </Text>

  <Text style={styles.description}>
    {i18n.t("cloud.description")}
  </Text>

  <View style={{ gap: 10 }}>
    <Button
      title={
        isMigrating
          ? i18n.t("cloud.syncingProgress", { progress })
          : i18n.t("cloud.backup")
      }
      onPress={handleSync}
      disabled={isMigrating || loading}
      color="#007AFF"
    />

    <Button
      title={loading ? i18n.t("cloud.restoring") : i18n.t("cloud.restore")}
      onPress={handleRestore}
      disabled={isMigrating || loading}
      color="#34C759"
    />
  </View>

  {isMigrating && (
    <View style={styles.progressSection}>
      <Text style={styles.progressLabel}>
        {i18n.t("cloud.syncingProgress", { progress })}
      </Text>

      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>

      <ActivityIndicator style={{ marginTop: 15 }} size="small" color="#007AFF" />
    </View>
  )}
</View>


      {/* --- Language & Appearance Card --- */}
      <View style={[styles.card, { backgroundColor: isDark ? '#1e1e1e' : '#fff', marginTop: 20 }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>{i18n.t("account.text_language")}</Text>
        
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => changeLang('en')}
            style={[styles.langBtn, { backgroundColor: lang === 'en' ? '#007AFF' : '#dcdcdc' }]}
          >
            <Text style={{ color: lang === 'en' ? '#fff' : '#000' }}>English</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => changeLang('ar')}
            style={[styles.langBtn, { backgroundColor: lang === 'ar' ? '#007AFF' : '#dcdcdc' }]}
          >
            <Text style={{ color: lang === 'ar' ? '#fff' : '#000' }}>العربية</Text>
          </TouchableOpacity>
        </View>

        {/* <Button
          title={i18n.t("account.text_dark_mode")}
          onPress={() => toggleTheme()}
        /> */}
      </View>

      {/* --- Account Section --- */}
      <View style={{ marginTop: 20, marginBottom: 40 }}>
        <Button title={i18n.t("account.text_title_logout")} color="#FF3B30" onPress={() => auth().signOut()} />
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  card: {
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  description: { fontSize: 13, color: '#666', marginBottom: 15 },
  langBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  progressSection: { marginTop: 25 },
  progressLabel: { textAlign: 'center', marginBottom: 10, fontWeight: '600', color: '#007AFF' },
  progressBarBackground: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
});