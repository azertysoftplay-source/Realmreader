import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@realm/react";
import { useTheme } from "../theme";
import i18n from "../i18n";
import { Currency } from "../realm/types";

/* ---------- STORAGE KEYS ---------- */
const RATES_KEY = "exchangeRates";
const BASE_KEY = "defaultCurrency";

/* ---------- SCREEN ---------- */
export default function ExchangeRateScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();

  /** ✅ ONLY ACTIVE CURRENCIES */
 const currencies = useQuery<Currency>("currency").filtered(
  "deleted == false OR deleted == null"
);

  const [baseCurrencyId, setBaseCurrencyId] = useState<string | null>(null);

  /** 🔥 STRING STATE (THIS FIXES iOS DOT ISSUE) */
  const [rateInputs, setRateInputs] = useState<Record<string, string>>({});

  /* ---------- HEADER ---------- */
  useLayoutEffect(() => {
    navigation.setOptions({
      title: i18n.t("rates.title"),
      headerStyle: { backgroundColor: theme.card },
      headerTintColor: theme.text,
    });
  }, [theme, i18n.language]);

  /* ---------- LOAD BASE + RATES ---------- */
  useEffect(() => {
    const load = async () => {
      const storedBase = await AsyncStorage.getItem(BASE_KEY);
      const storedRates = await AsyncStorage.getItem(RATES_KEY);

      if (storedBase && currencies.find(c => c._id === storedBase)) {
        setBaseCurrencyId(storedBase);
      } else if (currencies.length > 0) {
        setBaseCurrencyId(currencies[0]._id);
        await AsyncStorage.setItem(BASE_KEY, currencies[0]._id);
      }

      if (storedRates) {
        const parsed = JSON.parse(storedRates);
        const textMap: Record<string, string> = {};

        Object.entries(parsed).forEach(([k, v]: any) => {
          textMap[k] = String(v);
        });

        setRateInputs(textMap);
      }
    };

    if (currencies.length > 0) load();
  }, [currencies.length]);

  if (!baseCurrencyId) return null;

  /* ---------- SAVE RATE (NUMBER) ---------- */
  const persistRate = async (key: string, text: string) => {
    const rate = parseFloat(text);
    if (!Number.isFinite(rate) || rate <= 0) return;

    const stored = await AsyncStorage.getItem(RATES_KEY);
    const rates = stored ? JSON.parse(stored) : {};

    rates[key] = rate;
    await AsyncStorage.setItem(RATES_KEY, JSON.stringify(rates));
  };

  /* ---------- UI ---------- */
  return (
   <KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === "ios" ? "padding" : undefined}
  keyboardVerticalOffset={80} // adjust if you have a header
>
  <ScrollView
    keyboardShouldPersistTaps="handled"
    contentContainerStyle={{ paddingBottom: 130 }}
    style={[
      styles.container,
      { backgroundColor: isDark ? "#121212" : "#f5f5f5" },
    ]}
  >
    <Text style={[styles.header, { color: theme.text }]}>
      {i18n.t("rates.base")}
    </Text>

    {currencies
      .filter(c => c._id !== baseCurrencyId)
      .map(currency => {
        const key = `${baseCurrencyId}_${currency._id}`;

        return (
          <View
            key={currency._id}
            style={[styles.card, { backgroundColor: theme.card }]}
          >
            <Text style={{ color: theme.text, marginBottom: 6 }}>
              1 → {currency.name}
            </Text>

            <View style={styles.row}>
              <TextInput
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={rateInputs[key] ?? ""}
                onChangeText={(v) => {
                  const normalized = v.replace(",", ".");

                  if (/^\d*\.?\d*$/.test(normalized)) {
                    setRateInputs(prev => ({
                      ...prev,
                      [key]: normalized,
                    }));

                    persistRate(key, normalized);
                  }
                }}
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? "#1e1e1e" : "#fff",
                    color: theme.text,
                  },
                ]}
              />

              <Text style={{ color: theme.text, marginLeft: 10 }}>
                {currency.name}
              </Text>
            </View>
          </View>
        );
      })}
  </ScrollView>
</KeyboardAvoidingView>

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
