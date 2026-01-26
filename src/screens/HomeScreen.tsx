import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { useQuery } from "@realm/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";
import i18n from "../i18n";

import { Operation, ClientsDetails, Currency } from "../realm/types";
import { DeviceEventEmitter } from "react-native";


/* ================= STORAGE KEYS ================= */
const BASE_KEY = "defaultCurrency";
const RATES_KEY = "exchangeRates";

/* ================= HELPERS ================= */

const formatMoney = (v: number, c?: string) =>
  `${v.toFixed(2)} ${c ?? ""}`;

const convert = (
  value: number,
  fromId: string,
  toId: string,
  rates: Record<string, number>
) => {
  if (fromId === toId) return value;

  const direct = rates[`${fromId}_${toId}`];
  if (direct) return value * direct;

  const inverse = rates[`${toId}_${fromId}`];
  if (inverse) return value / inverse;

  return 0;
};

/* ================= SCREEN ================= */

export default function HomeScreen() {
  const scheme = useColorScheme();

  const [baseCurrencyId, setBaseCurrencyId] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<"creditors" | "debtors">("creditors");

  /* ================= REALM ================= */

  const clients = useQuery<ClientsDetails>("Clients_details").filtered(
    "deleted == false OR deleted == null"
  );

  const currencies = useQuery<Currency>("currency").filtered(
    "deleted == false OR deleted == null"
  );

  const operations = useQuery<Operation>("operation")
    .filtered("deleted == false OR deleted == null")
    .sorted("time", true);

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

  /* ================= LOAD SETTINGS ================= */

  useEffect(() => {
    const load = async () => {
      const base = await AsyncStorage.getItem(BASE_KEY);
      const r = await AsyncStorage.getItem(RATES_KEY);

      if (base) setBaseCurrencyId(base);
      if (r) setRates(JSON.parse(r));
      
    };
    load();
      const sub = DeviceEventEmitter.addListener(
    "currencyChanged",
    (newCurrencyId: string) => {
      setBaseCurrencyId(newCurrencyId);
    }
  );
    return () => sub.remove();
  }, []);

  /* ================= LOOKUP MAPS ================= */

  const clientNameById = useMemo(() => {
    const map: Record<string, string> = {};
    clients.forEach(c => (map[c._id] = c.Clients_name));
    return map;
  }, [clients]);

  const baseCurrencyName = useMemo(() => {
    if (!baseCurrencyId) return "";
    return currencies.find(c => c._id === baseCurrencyId)?.name ?? "";
  }, [baseCurrencyId, currencies]);

  /* ================= INCOME / EXPENSE (CONVERTED) ================= */

  const incomeExpense = useMemo(() => {
    if (!baseCurrencyId)
      return { income: 0, expense: 0, total: 0 };

    let income = 0;
    let expense = 0;

    operations.forEach(op => {
      if (!op.currency) return;

      const v = convert(
        op.value,
        op.currency._id,
        baseCurrencyId,
        rates
      );

      if (v > 0) income += v;
      if (v < 0) expense += v;
    });

    return { income, expense, total: income + expense };
  }, [operations, baseCurrencyId, rates]);

  /* ================= CLIENT BALANCES (CONVERTED) ================= */

  const clientBalances = useMemo(() => {
    if (!baseCurrencyId) return [];

    const map: Record<
      string,
      { name: string; converted: number; original: number }
    > = {};

    operations.forEach(op => {
      if (!op.currency) return;

      const converted = convert(
        op.value,
        op.currency._id,
        baseCurrencyId,
        rates
      );

      if (!map[op.client_id]) {
        map[op.client_id] = {
          name: clientNameById[op.client_id] ?? "",
          converted: 0,
          original: 0,
        };
      }

      map[op.client_id].converted += converted;
      map[op.client_id].original += op.value;
    });

    return Object.values(map);
  }, [operations, baseCurrencyId, rates, clientNameById]);

  /* ================= FILTERED LIST ================= */

  const list = useMemo(() => {
    return clientBalances
      .filter(c =>
        tab === "creditors" ? c.converted > 0 : c.converted < 0
      )
      .sort((a, b) =>
        tab === "creditors"
          ? b.converted - a.converted
          : a.converted - b.converted
      );
  }, [clientBalances, tab]);

  /* ================= UI ================= */

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* STATS */}
      <View style={styles.statsRow}>
        <StatBox
          label={i18n.t("dashboard.income")}
          value={incomeExpense.income}
          currency={baseCurrencyName}
          color={theme.green}
          theme={theme}
        />
        <StatBox
          label={i18n.t("dashboard.expense")}
          value={incomeExpense.expense}
          currency={baseCurrencyName}
          color={theme.red}
          theme={theme}
        />
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        {["creditors", "debtors"].map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t as any)}
            style={[
              styles.tab,
              tab === t && { borderBottomColor: theme.text },
            ]}
          >
            <Text style={{ color: theme.text }}>
              {t === "creditors"
                ? i18n.t("dashboard.topCreditors")
                : i18n.t("dashboard.topDebtors")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* LIST */}
      <FlatList
        data={list}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.rowItem, { backgroundColor: theme.card }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: "600" }}>
                {item.name}
              </Text>
              <Text style={styles.sub}>
                {formatMoney(item.original)}
              </Text>
            </View>

            <Text
              style={{
                fontWeight: "700",
                color:
                  item.converted >= 0 ? theme.green : theme.red,
              }}
            >
              {formatMoney(item.converted, baseCurrencyName)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

/* ================= COMPONENTS ================= */

const StatBox = ({
  label,
  value,
  currency,
  color,
  theme,
}: any) => (
  <View style={[styles.statBox, { backgroundColor: theme.card }]}>
    <Text style={{ color: theme.text, fontSize: 12 }}>{label}</Text>
    <Text style={{ color, fontWeight: "700" }}>
      {value.toFixed(2)} {currency}
    </Text>
  </View>
);

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  tabs: {
    flexDirection: "row",
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  sub: {
    fontSize: 12,
    opacity: 0.6,
  },
});
