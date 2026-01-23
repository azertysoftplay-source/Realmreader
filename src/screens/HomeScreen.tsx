import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
  FlatList,
  useColorScheme,
} from "react-native";
import { useRealm, useQuery } from "@realm/react";
import auth from "@react-native-firebase/auth";
import i18n from "../i18n";
import migrateFirestoreToRealm from "../helpers/firestoreToRealmSync";
import { Operation, ClientsDetails } from "../realm/types";
import { getAuth } from "@react-native-firebase/auth";
import { getApp } from "@react-native-firebase/app";
import { getFirestore, doc, deleteDoc } from "@react-native-firebase/firestore";

export default function HomeScreen() {
  const app = getApp();
  const auth = getAuth(app);
  const user = auth.currentUser;
  const realm = useRealm();
  const scheme = useColorScheme();
  const clients = useQuery<ClientsDetails>("Clients_details").filtered(
  "deleted == false OR deleted == null"
);
  const operations = useQuery<Operation>("operation").filtered(
  "deleted == false OR deleted == null"
).sorted("time", true);

  const [isInitialSync, setIsInitialSync] = useState(false);

  const theme =
    scheme === "dark"
      ? {
        bg: "#000",
        card: "#1C1C1E",
        text: "#FFF",
        green: "#30D158",
        red: "#FF453A",
      }
      : {
        bg: "#FFF",
        card: "#F5F5F5",
        text: "#000",
        green: "#2E7D32",
        red: "#C62828",
      };

  /* ================= RESTORE LOGIC ================= */
  useEffect(() => {
    const checkAndRestore = async () => {


      if (user && clients.length === 0 && !isInitialSync) {
        Alert.alert(
          i18n.t("restore.title"),
          i18n.t("restore.message"),
          [
            { text: i18n.t("restore.cancel"), style: "cancel" },
            {
              text: i18n.t("restore.confirm"),
              onPress: async () => {
                setIsInitialSync(true);
                try {
                  await migrateFirestoreToRealm(realm, user);
                  Alert.alert(i18n.t("restore.success"));
                } catch {
                  Alert.alert(i18n.t("restore.error"));
                } finally {
                  setIsInitialSync(false);
                }
              },
            },
          ]
        );
      }
    };

    checkAndRestore();
  }, [clients.length]);

  /* ================= STATS ================= */
  const stats = useMemo(() => {
    const income = operations.filtered("value > 0 AND (deleted == false OR deleted == null)").sum("value") || 0;
    const expense = operations.filtered("value < 0 AND (deleted == false OR deleted == null)").sum("value") || 0;
    return {
      income,
      expense,
      total: income + expense,
    };
  }, [operations]);

  /* ================= LOADING ================= */
  if (isInitialSync) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>
          {i18n.t("restore.loading")}
        </Text>
      </View>
    );
  }

  /* ================= DASHBOARD ================= */
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.welcome, { color: theme.text }]}>
        {i18n.t("home.welcome")}
      </Text>

      <View style={styles.row}>
        <StatCard title={i18n.t("dashboard.total")} value={stats.total} theme={theme} />
        <StatCard title={i18n.t("dashboard.income")} value={stats.income} theme={theme} />
        <StatCard title={i18n.t("dashboard.expense")} value={stats.expense} theme={theme} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={{ color: theme.text }}>
          {i18n.t("dashboard.clients")}: {clients.length}
        </Text>
      </View>

      <Text style={[styles.title, { color: theme.text }]}>
        {i18n.t("dashboard.recent")}
      </Text>

      <FlatList
        data={operations.slice(0, 5)}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.operationRow}>
            <Text style={{ color: theme.text }} numberOfLines={1}>
              {item.desc || "-"}
            </Text>
            <Text
              style={{
                color: item.value >= 0 ? theme.green : theme.red,
                fontWeight: "600",
              }}
            >
              {item.value}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

/* ================= COMPONENT ================= */
const StatCard = ({ title, value, theme }) => (
  <View style={[styles.card, { backgroundColor: theme.card }]}>
    <Text style={{ color: theme.text, fontSize: 12 }}>{title}</Text>
    <Text
      style={{
        fontSize: 18,
        fontWeight: "700",
        color: value >= 0 ? theme.green : theme.red,
      }}
    >
      {value.toFixed(2)}
    </Text>
  </View>
);

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  welcome: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  card: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    margin: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginVertical: 10,
  },
  operationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
});
