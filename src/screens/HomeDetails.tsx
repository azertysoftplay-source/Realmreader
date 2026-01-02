import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useColorScheme,
} from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useQuery } from "@realm/react";
import i18n from "../i18n";
import { HomeStackParamList } from "../stacks/HomeStack";
import { Operation, ClientsDetails } from "../realm/types";

type HomeDetailsRouteProp = RouteProp<HomeStackParamList, "HomeDetails">;

export default function HomeDetails() {
  const route = useRoute<HomeDetailsRouteProp>();
  const scheme = useColorScheme();

  // param still supported (optional)
  const id = route.params?.id;

  const theme = scheme === "dark"
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

  const operations = useQuery<Operation>("operation").sorted("time", true);
  const clients = useQuery<ClientsDetails>("Clients_details");

  /* ================= STATS ================= */
  const stats = useMemo(() => {
    const income = operations.filtered("value > 0").sum("value") || 0;
    const expense = operations.filtered("value < 0").sum("value") || 0;
    return {
      income,
      expense,
      total: income + expense,
    };
  }, [operations]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      
      {/* DASHBOARD */}
      <View style={styles.row}>
        <StatCard
          title={i18n.t("dashboard.total")}
          value={stats.total}
          theme={theme}
        />
        <StatCard
          title={i18n.t("dashboard.income")}
          value={stats.income}
          theme={theme}
        />
        <StatCard
          title={i18n.t("dashboard.expense")}
          value={stats.expense}
          theme={theme}
        />
      </View>

      {/* CLIENT COUNT */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={{ color: theme.text }}>
          {i18n.t("dashboard.clients")}: {clients.length}
        </Text>
      </View>

      {/* RECENT OPERATIONS */}
      <Text style={[styles.title, { color: theme.text }]}>
        {i18n.t("dashboard.recent")}
      </Text>

      <FlatList
        data={operations.slice(0, 5)}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.operationRow}>
            <Text style={{ color: theme.text }} numberOfLines={1}>
              {item.operation_id || "-"}
            </Text>
            <Text
              style={{
                color: item.value >= 0 ? theme.green : theme.red,
                fontWeight: "600",
              }}
            >
              {item._id}
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
  container: {
    flex: 1,
    padding: 12,
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
