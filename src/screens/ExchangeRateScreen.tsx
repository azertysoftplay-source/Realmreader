import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@realm/react";
import { Picker } from "@react-native-picker/picker";
import { useTheme } from "../theme";
import i18n from "../i18n";

/* ---------- TYPES ---------- */
type ExchangeRatesMap = Record<string, number>;

/* ---------- ASYNC HELPERS ---------- */
const RATES_KEY = "exchangeRates";
const BASE_KEY = "defaultCurrency";

async function loadRates(): Promise<ExchangeRatesMap> {
  const json = await AsyncStorage.getItem(RATES_KEY);
  return json ? JSON.parse(json) : {};
}

async function saveRate(from: string, to: string, rate: number) {
  const rates = await loadRates();
  rates[`${from}_${to}`] = rate;
  await AsyncStorage.setItem(RATES_KEY, JSON.stringify(rates));
}

/* ---------- SCREEN ---------- */
export default function ExchangeRateScreen({ navigation }: any) {
  const currencies = useQuery("currency"); // Realm
  const { theme, isDark } = useTheme();

  const [baseCurrencyId, setBaseCurrencyId] = useState<string | null>(null);
  const [rates, setRates] = useState<ExchangeRatesMap>({});

  /* ---------- MAP CURRENCIES BY ID ---------- */
  const currencyMap = useMemo(() => {
    const map: Record<string, any> = {};
    currencies.forEach((c: any) => {
      map[c._id] = c;
    });
    return map;
  }, [currencies]);

  const baseCurrency = baseCurrencyId
    ? currencyMap[baseCurrencyId]
    : null;

  /* ---------- HEADER ---------- */
  useLayoutEffect(() => {
    navigation.setOptions({
      title: i18n.t("rates.title"),
      headerStyle: { backgroundColor: theme.card },
      headerTintColor: theme.text,
    });
  }, [theme, i18n.language]);

  /* ---------- LOAD DATA ---------- */
  useEffect(() => {
    const load = async () => {
      const base = await AsyncStorage.getItem(BASE_KEY);
      const storedRates = await loadRates();

      if (base) setBaseCurrencyId(base);
      else if (currencies.length > 0)
        setBaseCurrencyId(currencies[0]._id);

      setRates(storedRates);
    };
    load();
  }, [currencies.length]);

  if (!baseCurrency) return null;

  /* ---------- UPDATE RATE ---------- */
  const updateRate = async (toId: string, value: string) => {
    const rate = parseFloat(value);
    if (!Number.isFinite(rate) || rate <= 0) return;

    await saveRate(baseCurrencyId!, toId, rate);
    setRates((prev) => ({
      ...prev,
      [`${baseCurrencyId}_${toId}`]: rate,
    }));
  };

  /* ---------- UI ---------- */
  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: isDark ? "#121212" : "#f5f5f5" },
      ]}
    >
      {/* BASE CURRENCY */}
      <Text style={[styles.header, { color: theme.text }]}>
        {i18n.t("rates.base")} {baseCurrency.name}
      </Text>

      {/* BASE SELECTOR */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Picker
          selectedValue={baseCurrencyId}
          onValueChange={async (val) => {
            setBaseCurrencyId(val);
            await AsyncStorage.setItem(BASE_KEY, val);
          }}
        >
          {currencies.map((c: any) => (
            <Picker.Item
              key={c._id}
              label={c.name}
              value={c._id}
            />
          ))}
        </Picker>
      </View>

      {/* RATES */}
      {currencies
        .filter((c: any) => c._id !== baseCurrencyId)
        .map((currency: any) => {
          const key = `${baseCurrencyId}_${currency._id}`;

          return (
            <View
              key={currency._id}
              style={[styles.card, { backgroundColor: theme.card }]}
            >
              <Text style={{ color: theme.text, marginBottom: 6 }}>
                1 {baseCurrency.name}
              </Text>

              <View style={styles.row}>
                <TextInput
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  value={rates[key]?.toString() ?? ""}
                  onChangeText={(v) =>
                    updateRate(currency._id, v)
                  }
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark
                        ? "#1e1e1e"
                        : "#fff",
                      color: theme.text,
                    },
                  ]}
                />

                <Text
                  style={{
                    color: theme.text,
                    marginLeft: 10,
                    minWidth: 80,
                  }}
                >
                  {currency.name}
                </Text>
              </View>
            </View>
          );
        })}
    </ScrollView>
  );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
  },
});
