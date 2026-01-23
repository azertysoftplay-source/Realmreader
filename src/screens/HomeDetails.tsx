import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useColorScheme,
} from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useQuery } from "@realm/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "../i18n";
import { HomeStackParamList } from "../stacks/HomeStack";
import { Operation, ClientsDetails } from "../realm/types";

/* ================= ASYNC KEYS ================= */
const BASE_KEY = "defaultCurrency";
const RATES_KEY = "exchangeRates";

type HomeDetailsRouteProp = RouteProp<HomeStackParamList, "HomeDetails">;

export default function HomeDetails() {
  const route = useRoute<HomeDetailsRouteProp>();
  const scheme = useColorScheme();

  /* ================= STATE ================= */
  const [baseCurrencyId, setBaseCurrencyId] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, number>>({});

  /* ================= THEME ================= */
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

  /* ================= REALM ================= */
  const operations = useQuery<Operation>("operation")
    .filtered("deleted == false OR deleted == null")
    .sorted("time", true);

  const clients = useQuery<ClientsDetails>("Clients_details").filtered(
    "deleted == false OR deleted == null"
  );

  /* ================= LOAD ASYNC DATA ================= */
  useEffect(() => {
    const loadAsync = async () => {
      const storedBase = await AsyncStorage.getItem(BASE_KEY);
      const storedRates = await AsyncStorage.getItem(RATES_KEY);

      if (storedBase) setBaseCurrencyId(storedBase);
      if (storedRates) setRates(JSON.parse(storedRates));
    };

    loadAsync();
  }, []);

  /* ================= CONVERSION HELPER ================= */
  const convertToBase = (
  amount: number,
  fromId: string,
  baseId: string,
  rates: Record<string, number>
) => {
  if (fromId === baseId) return amount;

  const direct = rates[`${fromId}_${baseId}`];
  if (direct) return amount * direct;

  const inverse = rates[`${baseId}_${fromId}`];
  if (inverse) return amount / inverse;

  return 0; // ❗ no rate defined
};

  /* ================= STATS ================= */
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;

    operations.forEach((op) => {
      const converted = convertToBase(op.value, op.currency._id,baseCurrencyId,rates);

      if (converted > 0) income += converted;
      if (converted < 0) expense += converted;
    });

    return {
      income,
      expense,
      total: income + expense,
    };
  }, [operations, rates, baseCurrencyId]);

  /* ================= UI ================= */
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
        renderItem={({ item }) => {
          //const converted = convertToBase(item.value, item.currency._id,);

          return (
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
                {item.value.toFixed(2)}
              </Text>
            </View>
          );
        }}
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
