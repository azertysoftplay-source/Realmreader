import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SettingsStackParamList } from "../stacks/SettingsStack";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth,signOut } from "@react-native-firebase/auth";
import { getApp } from "@react-native-firebase/app";
import { useRealm, useQuery } from "@realm/react";
import i18n from "../i18n";
import migrateClientsToFirestore from "../helpers/realmFirestoreSync";
import migrateFirestoreToRealm from "../helpers/firestoreToRealmSync";
import { Currency } from "../realm/types";
import ChangePasswordSection from "../components/changePassword";
import { useTheme } from "../theme";

/* ================= CONSTANTS ================= */
const LAST_SYNC_KEY = "lastSyncDate";
const DEFAULT_CURRENCY_KEY = "defaultCurrency";

type Props = NativeStackScreenProps<SettingsStackParamList, "SettingsMain">;

export default function SettingsScreen({ navigation }: Props) {
  const realm = useRealm();
  const { theme, isDark } = useTheme();
  const currencies = useQuery<Currency>("currency").filtered(
    "deleted == false OR deleted == null"
  );

  const auth = getAuth(getApp());
  const user = auth.currentUser;
  const isAppleUser = user?.providerData.some((p) => p.providerId === "apple.com");

  const [lang, setLang] = useState(i18n.language);
  const [defaultCurrency, setDefaultCurrency] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  /* ---------- HEADER ---------- */
  useLayoutEffect(() => {
    navigation.setOptions({
      title: i18n.t("tabbar.text_account"),
      headerStyle: { backgroundColor: theme.background },
      headerTintColor: theme.text,
    });
  }, [navigation, theme]);

  /* ---------- INITIAL LOAD ---------- */
  useEffect(() => {
    const loadSettings = async () => {
      const [storedCurrency, storedSync] = await Promise.all([
        AsyncStorage.getItem(DEFAULT_CURRENCY_KEY),
        AsyncStorage.getItem(LAST_SYNC_KEY),
      ]);

      if (storedCurrency) {
        setDefaultCurrency(storedCurrency);
      } else if (currencies.length > 0) {
        const firstId = currencies[0]._id;
        setDefaultCurrency(firstId);
        await AsyncStorage.setItem(DEFAULT_CURRENCY_KEY, firstId);
      }

      if (storedSync) setLastSync(new Date(storedSync));
    };
    loadSettings();
  }, [currencies.length]);

  /* ---------- ACTIONS ---------- */
  const saveLastSync = async () => {
    const now = new Date();
    setLastSync(now);
    await AsyncStorage.setItem(LAST_SYNC_KEY, now.toISOString());
  };

  const changeLang = async (l: string) => {
    await AsyncStorage.setItem("appLang", l);
    i18n.changeLanguage(l);
    setLang(l);
  };

  const changeCurrency = async (v: string) => {
    setDefaultCurrency(v);
    await AsyncStorage.setItem(DEFAULT_CURRENCY_KEY, v);
  };

  const backup = async () => {
    if (!user || syncing) return;
    setSyncing(true);
    try {
      await migrateClientsToFirestore(realm, user, () => {});
      await saveLastSync();
      Alert.alert(i18n.t("cloud.success"), i18n.t("cloud.backup_complete"));
    } catch (e) {
      Alert.alert(i18n.t("common.error"), e.message);
    } finally {
      setSyncing(false);
    }
  };

  const restore = async () => {
    if (!user || syncing) return;
    Alert.alert(
      i18n.t("cloud.restore_confirm_title"),
      i18n.t("cloud.restore_confirm_msg"),
      [
        { text: i18n.t("common.text_cancel"), style: "cancel" },
        {
          text: i18n.t("cloud.restore"),
          onPress: async () => {
            setSyncing(true);
            try {
              await migrateFirestoreToRealm(realm, user);
              await saveLastSync();
              Alert.alert(i18n.t("cloud.success"), i18n.t("cloud.restore_complete"));
            } catch (e) {
              console.log(e.message)
              Alert.alert(i18n.t("common.error"), e.message);
            } finally {
              setSyncing(false);
            }
          },
        },
      ]
    );
  };

  /* ---------- SHARED UI COMPONENTS ---------- */
  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: isDark ? "#8E8E93" : "#6D6D72" }]}>
      {title}
    </Text>
  );

  const GroupCard = ({ children }: { children: React.ReactNode }) => (
    <View style={[styles.group, { backgroundColor: isDark ? "#1C1C1E" : "#FFF" }]}>
      {children}
    </View>
  );

  const Row = ({ title, onPress, right, danger }: any) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: isDark ? "#38383A" : "#C6C6C8" },
        pressed && { backgroundColor: isDark ? "#2C2C2E" : "#E5E5EA" },
      ]}
    >
      <Text style={[styles.rowText, { color: danger ? "#FF453A" : theme.text }]}>
        {title}
      </Text>
      {right}
    </Pressable>
  );

  const Chevron = () => <Text style={{ fontSize: 18, color: "#C7C7CC" }}>›</Text>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? "#000" : "#F2F2F7" }]}>
      {/* ---------- ACCOUNT ---------- */}
      <SectionHeader title={i18n.t("account.text_setting")} />
      <GroupCard>
        {!isAppleUser && <ChangePasswordSection />}
        <Row
          title={i18n.t("account.text_title_logout")}
          danger
          onPress={() => {
    Alert.alert(
      i18n.t("account.text_title_logout"), // "Log Out"
      i18n.t("account.text_description_logout"),   // "Are you sure you want to log out?"
      [
        {
          text: i18n.t("common.text_cancel"),
          style: "cancel",
        },
        {
          text: i18n.t("account.text_title_logout"),
          style: "destructive", // Red text on iOS
          onPress: () => auth.signOut(),
        },
      ]
    );
  }}

        />
      </GroupCard>

      {/* ---------- CLOUD ---------- */}
      <SectionHeader title={i18n.t("cloud.title")} />
      <GroupCard>
        <Row
          title={i18n.t("cloud.backup")}
          onPress={backup}
          right={syncing ? <ActivityIndicator size="small" color={theme.primary} /> : <Chevron />}
        />
        <Row
          title={i18n.t("cloud.restore")}
          onPress={restore}
          right={syncing ? <ActivityIndicator size="small" color={theme.primary} /> : <Chevron />}
        />
      </GroupCard>

      {lastSync && (
        <Text style={styles.lastSyncText}>
          {i18n.t("cloud.lastSync")}: {lastSync.toLocaleString()}
        </Text>
      )}

      {/* ---------- LANGUAGE ---------- */}
      <SectionHeader title={i18n.t("account.text_language")} />
      <GroupCard>
        <Row
          title="English"
          onPress={() => changeLang("en")}
          right={lang === "en" ? <Text style={{ color: theme.primary }}>✓</Text> : null}
        />
        <Row
          title="العربية"
          onPress={() => changeLang("ar")}
          right={lang === "ar" ? <Text style={{ color: theme.primary }}>✓</Text> : null}
        />
      </GroupCard>

      {/* ---------- EXCHANGE RATES ---------- */}
      <TouchableOpacity
        onPress={() => navigation.navigate("ExchangeRates")}
        style={[styles.rateCard, { backgroundColor: isDark ? "#1C1C1E" : "#FFF" }]}
      >
        <Text style={[styles.rowText, { color: theme.text, fontWeight: "600" }]}>
          {i18n.t("rates.title")}
        </Text>
        <Text style={{ color: "#8E8E93", marginTop: 4 }}>{i18n.t("rates.description")}</Text>
      </TouchableOpacity>

      {/* ---------- DEFAULT CURRENCY ---------- */}
      <SectionHeader title={i18n.t("settings.defaultCurrency")} />
      <GroupCard>
        <Picker
          selectedValue={defaultCurrency}
          onValueChange={changeCurrency}
          dropdownIconColor={isDark ? "#FFF" : "#000"}
          style={{ color: theme.text }}
        >
          {currencies.map((c) => (
            <Picker.Item key={c._id} label={c.name} value={c._id} color={isDark ? "#FFF" : "#000"} />
          ))}
        </Picker>
      </GroupCard>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 16,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  group: {
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { fontSize: 17 },
  lastSyncText: {
    marginTop: 8,
    marginLeft: 16,
    fontSize: 12,
    color: "#8E8E93",
  },
  rateCard: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 10,
  },
});
