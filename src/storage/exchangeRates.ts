import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "exchangeRates";

export type ExchangeRateMap = Record<string, number>;

/* Load all rates */
export async function getExchangeRates(): Promise<ExchangeRateMap> {
  const json = await AsyncStorage.getItem(KEY);
  return json ? JSON.parse(json) : {};
}

/* Save / update one rate */
export async function setExchangeRate(
  from: string,
  to: string,
  rate: number
) {
  const rates = await getExchangeRates();
  rates[`${from}_${to}`] = rate;
  await AsyncStorage.setItem(KEY, JSON.stringify(rates));
}

/* Get one rate */
export async function getExchangeRate(
  from: string,
  to: string
): Promise<number | null> {
  const rates = await getExchangeRates();
  return rates[`${from}_${to}`] ?? null;
}
