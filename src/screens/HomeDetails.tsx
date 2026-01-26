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
import { Operation, ClientsDetails, Currency } from "../realm/types";

/* ================= KEYS ================= */
const BASE_KEY = "defaultCurrency";
const RATES_KEY = "exchangeRates";

type HomeDetailsRouteProp = RouteProp<HomeStackParamList, "HomeDetails">;

/* ================= HELPERS ================= */

const formatDate = (d?: Date) => {
  if (!d) return "Unknown date";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatAmount = (value: number, currency?: string) =>
  `${value >= 0 ? "" : "-"}${Math.abs(value).toFixed(2)} ${currency ?? ""}`;

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

  return 0;
};

/* ================= SCREEN ================= */

export default function HomeDetails() {
  const route = useRoute<HomeDetailsRouteProp>();
  const scheme = useColorScheme();

  /* ---------- THEME ---------- */
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

  /* ---------- STATE ---------- */
  const [baseCurrencyId, setBaseCurrencyId] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, number>>({});

  /* ---------- REALM ---------- */
  const operations = useQuery<Operation>("operation")
    .filtered("deleted == false OR deleted == null")
    .sorted("time", true);

  const clients = useQuery<ClientsDetails>("Clients_details").filtered(
    "deleted == false OR deleted == null"
  );

  const currencies = useQuery<Currency>("currency");

  /* ---------- LOAD STORAGE ---------- */
  useEffect(() => {
    const load = async () => {
      const base = await AsyncStorage.getItem(BASE_KEY);
      const storedRates = await AsyncStorage.getItem(RATES_KEY);

      if (base) setBaseCurrencyId(base);
      if (storedRates) setRates(JSON.parse(storedRates));
    };

    load();
  }, []);

  /* ---------- BASE CURRENCY ---------- */
  const baseCurrency = useMemo(
    () => currencies.find((c) => c._id === baseCurrencyId),
    [currencies, baseCurrencyId]
  );

  /* ---------- STATS ---------- */
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;

    operations.forEach((op) => {
      if (!baseCurrencyId || !op.currency) return;

      const converted = convertToBase(
        op.value,
        op.currency._id,
        baseCurrencyId,
        rates
      );

      if (converted > 0) income += converted;
      if (converted < 0) expense += converted;
    });

    return {
      income,
      expense,
      total: income + expense,
    };
  }, [operations, rates, baseCurrencyId]);

  /* ---------- GROUP BY DATE ---------- */
  const groupedOperations = useMemo(() => {
    const groups: Record<string, Operation[]> = {};

    operations.forEach((op) => {
      const key = formatDate(op.time);
      if (!groups[key]) groups[key] = [];
      groups[key].push(op);
    });

    return Object.entries(groups).map(([date, items]) => ({
      date,
      items,
    }));
  }, [operations]);

  /* ================= RENDER ================= */

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* ---------- STATS ---------- */}
      <View style={styles.row}>
        <StatCard
          title={i18n.t("dashboard.total")}
          value={stats.total}
          currency={baseCurrency?.name}
          theme={theme}
        />
        <StatCard
          title={i18n.t("dashboard.income")}
          value={stats.income}
          currency={baseCurrency?.name}
          theme={theme}
        />
        <StatCard
          title={i18n.t("dashboard.expense")}
          value={stats.expense}
          currency={baseCurrency?.name}
          theme={theme}
        />
      </View>

      {/* ---------- CLIENT COUNT ---------- */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={{ color: theme.text }}>
          {i18n.t("dashboard.clients")}: 3
        </Text>
      </View>

      {/* ---------- OPERATIONS ---------- */}
      <Text style={[styles.title, { color: theme.text }]}>
        {i18n.t("dashboard.recent")}
      </Text>

      <FlatList
        data={groupedOperations}
        keyExtractor={(item) => item.date}
        renderItem={({ item }) => (
          <View>
            <Text style={[styles.dateHeader, { color: theme.text }]}>
              {item.date}
            </Text>

            {item.items.map((op) => {
              const converted =
                baseCurrencyId && op.currency
                  ? convertToBase(
                      op.value,
                      op.currency._id,
                      baseCurrencyId,
                      rates
                    )
                  : 0;

              return (
                <View key={op._id} style={styles.operationRow}>
                  <Text
                    style={{ color: theme.text, flex: 1 }}
                    numberOfLines={1}
                  >
                    {op.operation_id || "-"}
                  </Text>

                  <View style={{ alignItems: "flex-end" }}>
                    {/* CONVERTED */}
                    <Text
                      style={{
                        color:
                          converted >= 0 ? theme.green : theme.red,
                        fontWeight: "700",
                      }}
                    >
                      {formatAmount(
                        converted,
                        baseCurrency?.name
                      )}
                    </Text>

                    {/* ORIGINAL */}
                    <Text style={styles.originalValue}>
                      ({formatAmount(op.value, op.currency?.name)})
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      />
    </View>
  );
}

/* ================= COMPONENTS ================= */

const StatCard = ({ title, value, currency, theme }: any) => (
  <View style={[styles.card, { backgroundColor: theme.card }]}>
    <Text style={{ color: theme.text, fontSize: 12 }}>{title}</Text>
    <Text
      style={{
        fontSize: 18,
        fontWeight: "700",
        color: value >= 0 ? theme.green : theme.red,
      }}
    >
      {formatAmount(value, currency)}
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
  dateHeader: {
    marginTop: 14,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: "700",
    opacity: 0.7,
  },
  operationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  originalValue: {
    fontSize: 12,
    opacity: 0.6,
  },
});
