import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fi from "./locales/fi.json";

// UI copy lives in src/locales/*.json. Edit the active language's file to
// retitle the gallery or reword anything; add another file plus a resource
// entry here to offer more languages. `lng` selects the default language.
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fi: { translation: fi },
  },
  lng: "fi",
  fallbackLng: "en",
  interpolation: { escapeValue: false }, // React already escapes
});

export default i18n;
