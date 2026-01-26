import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  TouchableOpacity,
  Modal,
  DeviceEventEmitter,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import auth, { getAuth } from "@react-native-firebase/auth";
import { useRealm, useQuery } from "@realm/react";
import { Picker } from "@react-native-picker/picker";
import * as Progress from "react-native-progress";

import { SettingsStackParamList } from "../stacks/SettingsStack";
import migrateClientsToFirestore from "../helpers/realmFirestoreSync";
import migrateFirestoreToRealm from "../helpers/firestoreToRealmSync";
import { Currency } from "../realm/types";
import ChangePasswordSection from "../components/changePassword";
import i18n from "../i18n";
import { useTheme } from "../theme";
import { getApp } from "@react-native-firebase/app";
const LAST_SYNC_KEY = "lastSyncDate";
const DEFAULT_CURRENCY_KEY = "defaultCurrency";

type Props = NativeStackScreenProps<
  SettingsStackParamList,
  "SettingsMain"
>;

/* ================= UI HELPERS ================= */




/* ================= SCREEN ================= */

export default function SettingsScreen({ navigation }: Props) {
  const realm = useRealm();
  const { theme, isDark } = useTheme();
  const currencies = useQuery<Currency>("currency").filtered(
    "deleted == false OR deleted == null"
  );
  const auth = getAuth(getApp());
  const user = auth.currentUser;
  const isAppleUser = user?.providerData.some(
    (p) => p.providerId === "apple.com"
  );

  const [lang, setLang] = useState(i18n.language);
  const [defaultCurrency, setDefaultCurrency] = useState<string | null>(null);

  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [currencyModal, setCurrencyModal] = useState(false);
  const [tempCurrency, setTempCurrency] = useState<string | null>(defaultCurrency);



  /* ---------- HEADER ---------- */
  useLayoutEffect(() => {
    navigation.setOptions({
      title: i18n.t("account.text_setting"),
      headerStyle: { backgroundColor: theme.card },
      headerTintColor: theme.text,
    });
  }, [navigation,lang,theme]);

  /* ---------- LOAD DEFAULT CURRENCY ---------- */
  useEffect(() => {
    const loadSettings = async () => {
      const [storedCurrency, storedSync] = await Promise.all([
        AsyncStorage.getItem(DEFAULT_CURRENCY_KEY),
        AsyncStorage.getItem(LAST_SYNC_KEY),
      ]);
      if (storedCurrency) setDefaultCurrency(storedCurrency);
      else if (currencies.length) {
        setDefaultCurrency(currencies[0]._id);
        await AsyncStorage.setItem(DEFAULT_CURRENCY_KEY, currencies[0]._id);
      }
    };
    loadSettings();
  }, [currencies.length]);
  useEffect(() => {
  if (currencyModal) {
    setTempCurrency(defaultCurrency);
  }
}, [currencyModal]);

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
    await AsyncStorage.setItem("defaultCurrency", v);
    DeviceEventEmitter.emit("currencyChanged", v);
  };

  const backup = async () => {
    if (!user) return;
    setBackupLoading(true);
    setBackupProgress(0);

    try {
      await migrateClientsToFirestore(
        realm,
        user,
        (p: number) => setBackupProgress(p)
      );
    } finally {
      setBackupLoading(false);
      setBackupProgress(0);
    }
  };

  const restore = async () => {
    if (!user) return;
    Alert.alert(
      i18n.t("cloud.restore_confirm_title"),
      i18n.t("cloud.restore_confirm_msg"),
      [
        { text: i18n.t("common.text_cancel"), style: "cancel" },
        {
          text: i18n.t("cloud.restore"),
          onPress: async () => {
            setRestoreLoading(true);
            setRestoreProgress(0);

            try {
              await migrateFirestoreToRealm(
                realm,
                user,
                (p: number) => setRestoreProgress(p));
              await saveLastSync();
              Alert.alert(i18n.t("cloud.success"), i18n.t("cloud.restore_complete"));
            } catch (e) {
              console.log(e.message)
              Alert.alert(i18n.t("common.error"), e.message);

            } finally {
              setRestoreLoading(false);
              setRestoreProgress(0);
            }
          },
        },
      ]
    );
  };
  const Chevron = () => (
  <Text style={{ fontSize: 18, color: "#C7C7CC" }}>›</Text>
);

const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: isDark ? "#8E8E93" : "#6D6D72" }]}>{title}</Text>
);

const GroupCard = ({ children }: { children: React.ReactNode }) => (
    <View style={[styles.group, { backgroundColor: isDark ? "#1C1C1E" : "#FFF" }]}>
{children}</View>
);

const Row = ({
  title,
  onPress,
  right,
  danger,
}: {
  title: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.row,
        { borderBottomColor: isDark ? "#38383A" : "#C6C6C8" },
      pressed && { backgroundColor: isDark ? "#38383A" : "#C6C6C8" },
    ]}
  >
      <Text style={[styles.rowText, { color: danger ? "#FF453A" : theme.text }]}>
      {title}
    </Text>
    {right}
  </Pressable>
);

const RowProgress = ({ progress }: { progress: number }) => (
  <Progress.Bar
    progress={progress}
    width={60}
    height={4}
    borderRadius={3}
    color="#007AFF"
    unfilledColor="#E5E5EA"
    borderWidth={0}
    animated
  />
);

  /* ================= RENDER ================= */

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? "#000" : "#F2F2F7" }]}>
      {/* ---------- ACCOUNT ---------- */}
   

      {/* ---------- CLOUD ---------- */}
      <SectionHeader title={i18n.t("cloud.title")} />
      <GroupCard>
        <Row
          title={i18n.t("cloud.backup")}
          onPress={!backupLoading ? backup : undefined}
          right={
            backupLoading ? (
              <RowProgress progress={backupProgress} />
            ) : (
              <Chevron />
            )
          }
        />

        <Row
          title={i18n.t("cloud.restore")}
          onPress={!restoreLoading ? restore : undefined}
          right={
            restoreLoading ? (
              <RowProgress progress={restoreProgress} />
            ) : (
              <Chevron />
            )
          }
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
          right={lang === "en" ? <Text style={{ color: theme.primary }}>✓</Text> : undefined}
        />
        <Row
          title="العربية"
          onPress={() => changeLang("ar")}
          right={lang === "ar" ? <Text style={{ color: theme.primary }}>✓</Text> : undefined}
        />
      </GroupCard>
      <SectionHeader title={i18n.t("account.text_language")} />


      {/* ---------- EXCHANGE RATES ---------- */}
      <GroupCard>
        <Row
          title={i18n.t("rates.title")}
          onPress={() => navigation.navigate("ExchangeRates")}
        >


        </Row>
        {/* ---------- DEFAULT CURRENCY ---------- */}
        {/*  <SectionHeader title={i18n.t("settings.defaultCurrency")} /> */}

        <Row
          title={i18n.t("settings.defaultCurrency")}
          onPress={() => setCurrencyModal(true)}
          right={<Text style={ {color: theme.primary }}>{currencies.find(c => c._id === defaultCurrency)?.name ?? null} </Text>}
        />
      </GroupCard>
         <SectionHeader title={i18n.t("account.text_profile")} />
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
    <Modal
  visible={currencyModal}
  transparent
  animationType="slide"
  statusBarTranslucent
>
  {/* Overlay */}


  {/* Bottom Sheet */}
  <View style={styles.overlay}>
           <View style={[styles.modal, { backgroundColor: theme.card }]}>
    {/* Header */}
    

    {/* Picker */}
    <Picker
      selectedValue={tempCurrency}
      onValueChange={setTempCurrency}
      dropdownIconColor={theme.text}
    >
      {currencies.map((c) => (
        <Picker.Item
          key={c._id}
          label={c.name}
          value={c._id}
          color={theme.text}   // 👈 important for Android dark mode
        />
      ))}
    </Picker>
     <View style={styles.actions}>
        <Pressable onPress={() => setCurrencyModal(false)}>
        <Text style={[styles.cancelBtn, { color: theme.text }]}>
          {i18n.t("common.text_cancel")}
        </Text>
      </Pressable>
     <Pressable
        onPress={() => {
          if (tempCurrency) {
            changeCurrency(tempCurrency);
          }
          setCurrencyModal(false);
        }}
      >
        <Text style={[styles.saveBtn, { color: theme.primary }]}>
          {i18n.t("common.text_button_save")}
        </Text>
      </Pressable>
      </View>
  </View>
  </View>
</Modal>


    </ScrollView>

  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
   
  },
  sectionHeader: {
    marginTop: 30,
    marginBottom: 8,
    marginLeft: 16,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  group: {
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
 borderBottomWidth: StyleSheet.hairlineWidth,
     borderBottomColor: "#C6C6C8",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  rowText: {
    fontSize: 16,
  },
  lastSyncText: {
    marginTop: 8,
    marginLeft: 16,
    fontSize: 12,
    color: "#8E8E93",
  },
  pickerRow: {
    paddingHorizontal: 10,
  },
  rateCard: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 10,
  },
  modalOverlay: {
    flex: 1,
        justifyContent: "center",

    backgroundColor: "rgba(0,0,0,0.3)",
  },

  modalCard: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },

  modalTitle: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },


modalHeader: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  paddingVertical: 14,
  borderBottomWidth: 0.5,
},
 modal: {
    borderRadius: 16,
    padding: 20,
  },



cancelBtn: {
  fontSize: 16,
},

saveBtn: {
  fontSize: 16,
  fontWeight: "600",
},
actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 20,
    marginTop: 15,
  },

});
