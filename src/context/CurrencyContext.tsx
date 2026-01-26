import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@realm/react";
import { Currency } from "../realm/types";

const BASE_KEY = "defaultCurrency";

type CurrencyContextType = {
  currencyId: string | null;
  currencyName: string;
  setCurrency: (id: string) => Promise<void>;
  ready: boolean;
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const currencies = useQuery<Currency>("currency").filtered(
    "deleted == false OR deleted == null"
  );

  const [currencyId, setCurrencyId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  /* ---------- LOAD ---------- */
  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem(BASE_KEY);

      if (stored) {
        setCurrencyId(stored);
      } else if (currencies.length > 0) {
        setCurrencyId(currencies[0]._id);
        await AsyncStorage.setItem(BASE_KEY, currencies[0]._id);
      }

      setReady(true);
    };

    load();
  }, [currencies.length]);

  /* ---------- SET ---------- */
  const setCurrency = async (id: string) => {
    setCurrencyId(id);
    await AsyncStorage.setItem(BASE_KEY, id);
  };

  const currencyName =
    currencies.find(c => c._id === currencyId)?.name ?? "";

  return (
    <CurrencyContext.Provider
      value={{
        currencyId,
        currencyName,
        setCurrency,
        ready,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

/* ---------- HOOK ---------- */
export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used inside CurrencyProvider");
  }
  return ctx;
}
