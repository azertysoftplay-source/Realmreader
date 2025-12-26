import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "react-native-localize";

import en from "./en.json";
import ar from "./ar.json";

const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

const fallback = { languageTag: "en" };

const supported = ["en", "ar"];
const locales = getLocales();
let languageTag = fallback.languageTag;
if (locales && locales.length) {
  for (const locale of locales) {
    const tag = locale.languageTag || locale.languageCode;
    const code = tag.split("-")[0];
    if (supported.includes(code)) {
      languageTag = code;
      break;
    }
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: languageTag,
    fallbackLng: "en",
    compatibilityJSON: "v4",
    interpolation: { escapeValue: false },
  });

export default i18n;
