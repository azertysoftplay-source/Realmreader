import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SettingsStackParamList } from "../stacks/SettingsStack";
import i18n from "../i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../theme";
import auth from "@react-native-firebase/auth";
import { useRealm, useQuery } from "@realm/react";
import migrateClientsToFirestore from "../helpers/realmFirestoreSync";
import migrateFirestoreToRealm from "../helpers/firestoreToRealmSync";
import { Picker } from "@react-native-picker/picker";
import { currency as cur} from "../models/Clients_details";

type Props = NativeStackScreenProps<SettingsStackParamList, "SettingsMain">;

export default function SettingsScreen({ navigation }: Props) {
  const realm = useRealm();
  const currencies = useQuery<currency>("currency"); // typed query

  const { theme, isDark } = useTheme();

  const [loading, setLoading] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lang, setLang] = useState(i18n.language);
  const [defaultCurrency, setDefaultCurrency] = useState<string | null>(null);

  /* ---------------- HEADER ---------------- */
  useLayoutEffect(() => {
    navigation.setOptions({
      title: i18n.t("tabbar.text_account"),
      headerStyle: { backgroundColor: theme.card },
      headerTintColor: theme.text,
    });
  }, [navigation, theme, i18n.language]);

  /* ---------------- LOAD DEFAULT CURRENCY ---------------- */
  useEffect(() => {
    const loadCurrency = async () => {
      const stored = await AsyncStorage.getItem("defaultCurrency");
      if (stored) {
        setDefaultCurrency(stored);
      } else if (currencies.length > 0) {
        setDefaultCurrency(currencies[0]._id);
        await AsyncStorage.setItem("defaultCurrency", currencies[0]._id);
      }
    };
    loadCurrency();
  }, [currencies.length]);

  /* ---------------- CHANGE LANGUAGE ---------------- */
  const changeLang = async (value: string) => {
    await AsyncStorage.setItem("appLang", value);
    i18n.changeLanguage(value);
    setLang(value);
  };

  /* ---------------- CHANGE CURRENCY ---------------- */
  const changeCurrency = async (value: string) => {
    setDefaultCurrency(value);
    await AsyncStorage.setItem("defaultCurrency", value);
  };

  /* ---------------- CLOUD SYNC ---------------- */
  const handleRestore = async () => {
    const user = auth().currentUser;
    if (!user) return;

    setLoading(true);
    try {
      await migrateFirestoreToRealm(realm, user);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    const user = auth().currentUser;
    if (!user) return;

    setIsMigrating(true);
    setProgress(0);

    try {
      await migrateClientsToFirestore(realm, user, setProgress);
    } finally {
      setIsMigrating(false);
      setProgress(0);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? "#121212" : "#f5f5f5" }]}
    >
      <Text style={[styles.header, { color: theme.text }]}>
        {i18n.t("account.text_setting")}
      </Text>

      {/* ---------- CLOUD CARD ---------- */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {i18n.t("cloud.title")}
        </Text>

        <Button
          title={i18n.t("cloud.backup")}
          onPress={handleSync}
          disabled={isMigrating || loading}
        />
        <Button
          title={i18n.t("cloud.restore")}
          onPress={handleRestore}
          disabled={isMigrating || loading}
          color="#34C759"
        />

        {isMigrating && (
          <Text style={{ marginTop: 10 }}>
            {i18n.t("cloud.syncingProgress", { progress })}
          </Text>
        )}
      </View>

      {/* ---------- LANGUAGE ---------- */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {i18n.t("account.text_language")}
        </Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            style={[
              styles.langBtn,
              { backgroundColor: lang === "en" ? "#007AFF" : "#ccc" },
            ]}
            onPress={() => changeLang("en")}
          >
            <Text style={styles.langText}>English</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.langBtn,
              { backgroundColor: lang === "ar" ? "#007AFF" : "#ccc" },
            ]}
            onPress={() => changeLang("ar")}
          >
            <Text style={styles.langText}>العربية</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ---------- EXCHANGE RATES LINK ---------- */}
      <TouchableOpacity
        onPress={() => navigation.navigate("ExchangeRates")}
        style={[
          styles.card,
          {
            backgroundColor: isDark ? "#1e1e1e" : "#fff",
            marginTop: 20,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {i18n.t("rates.title")}
        </Text>
        <Text style={{ color: "#888", marginTop: 6 }}>
          {i18n.t("rates.description")}
        </Text>
      </TouchableOpacity>

      {/* ---------- DEFAULT CURRENCY ---------- */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {i18n.t("settings.defaultCurrency")}
        </Text>

        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={defaultCurrency}
            onValueChange={changeCurrency}
            dropdownIconColor={theme.text}
          >
            {currencies.map((c) => (
              <Picker.Item key={c._id} label={c.name} value={c._id} color={theme.text} />
            ))}
          </Picker>
        </View>
      </View>

      {/* ---------- LOGOUT ---------- */}
      <View style={{ marginBottom: 40 }}>
        <Button
          title={i18n.t("account.text_title_logout")}
          color="#FF3B30"
          onPress={() => auth().signOut()}
        />
      </View>
    </ScrollView>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 10 },
  card: {
    padding: 20,
    borderRadius: 14,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  langBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  langText: { color: "#fff", fontWeight: "600" },
  pickerWrapper: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    borderColor: "#ccc",
  },
});
