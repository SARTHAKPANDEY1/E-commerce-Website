import { useEffect, useMemo, useState } from "react";
import { readJSON, writeJSON } from "./useLocalStorage";

export const APP_SETTINGS_KEY = "ec_user_settings_v1";

export const DEFAULT_APP_SETTINGS = {
  theme: "light",
  language: "english",
  preferredOption: "default",
};

const HINDI_TRANSLATIONS = {
  Settings: "सेटिंग्स",
  "Dashboard Settings": "डैशबोर्ड सेटिंग्स",
  Language: "भाषा",
  Theme: "थीम",
  "Preferred Option": "पसंदीदा विकल्प",
  English: "अंग्रेज़ी",
  Hindi: "हिंदी",
  Light: "लाइट",
  Dark: "डार्क",
  System: "सिस्टम",
  Default: "डिफ़ॉल्ट",
  Shopping: "शॉपिंग",
  Orders: "ऑर्डर्स",
  Analytics: "एनालिटिक्स",
  Close: "बंद करें",
  Home: "होम",
  Login: "लॉगिन",
  Register: "रजिस्टर",
  "My Orders": "मेरे ऑर्डर्स",
  Checkout: "चेकआउट",
  "Place Order": "ऑर्डर करें",
  "Could not place order.": "ऑर्डर नहीं हो सका।",
  "Delivery Information": "डिलीवरी जानकारी",
  "Full Name": "पूरा नाम",
  Phone: "फोन",
  Email: "ईमेल",
  Address: "पता",
  City: "शहर",
  State: "राज्य",
  Pincode: "पिनकोड",
  Total: "कुल",
  Shipping: "शिपिंग",
  Cart: "कार्ट",
  "Search products": "प्रोडक्ट खोजें",
  "Continue with Google": "Google से जारी रखें",
  "Add Product": "प्रोडक्ट जोड़ें",
  Stock: "स्टॉक",
  Price: "कीमत",
  Quantity: "मात्रा",
  Logout: "लॉगआउट",
  "View Details": "विवरण देखें",
  "Hide Details": "विवरण छिपाएं",
  "Cancel Order": "ऑर्डर रद्द करें",
  Reason: "कारण",
  Submit: "सबमिट",
  Profile: "प्रोफाइल",
  Products: "प्रोडक्ट्स",
  "New Arrivals": "नए आगमन",
  "Order Placed": "ऑर्डर हो गया",
  "Order placed successfully": "ऑर्डर सफलतापूर्वक हो गया",
  "Your order has been placed": "आपका ऑर्डर हो गया है",
  Vendor: "विक्रेता",
  "Vendor Dashboard": "विक्रेता डैशबोर्ड",
  Revenue: "राजस्व",
  Overview: "ओवरव्यू",
};

const TRANSLATION_ENTRIES = Object.entries(HINDI_TRANSLATIONS).sort((a, b) => b[0].length - a[0].length);
const ORIGINAL_TEXT_NODES = new WeakMap();
const ORIGINAL_ELEMENT_ATTRS = new WeakMap();
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA"]);
let i18nObserver = null;

function translateText(text, language) {
  if (language !== "hindi" || !text) return text;
  let translated = text;
  for (const [english, hindi] of TRANSLATION_ENTRIES) {
    translated = translated.split(english).join(hindi);
  }
  return translated;
}

function shouldSkipTextNode(textNode) {
  if (!textNode || !textNode.nodeValue || !textNode.nodeValue.trim()) return true;
  const parentTag = textNode.parentElement?.tagName;
  return parentTag ? SKIP_TAGS.has(parentTag) : false;
}

function applyTranslationToTextNode(textNode, language) {
  if (shouldSkipTextNode(textNode)) return;
  if (!ORIGINAL_TEXT_NODES.has(textNode)) {
    ORIGINAL_TEXT_NODES.set(textNode, textNode.nodeValue || "");
  }
  const original = ORIGINAL_TEXT_NODES.get(textNode) || "";
  const nextValue = language === "hindi" ? translateText(original, language) : original;
  if (textNode.nodeValue !== nextValue) {
    textNode.nodeValue = nextValue;
  }
}

function applyTranslationToElementAttrs(element, language) {
  if (!element || !element.getAttribute) return;
  const attrs = ["placeholder", "title", "aria-label", "value"];
  let originalAttrs = ORIGINAL_ELEMENT_ATTRS.get(element);
  if (!originalAttrs) {
    originalAttrs = {};
    ORIGINAL_ELEMENT_ATTRS.set(element, originalAttrs);
  }
  for (const attr of attrs) {
    if (!element.hasAttribute(attr)) continue;
    if (!(attr in originalAttrs)) {
      originalAttrs[attr] = element.getAttribute(attr) || "";
    }
    const base = originalAttrs[attr] || "";
    const nextValue = language === "hindi" ? translateText(base, language) : base;
    if ((element.getAttribute(attr) || "") !== nextValue) {
      element.setAttribute(attr, nextValue);
    }
  }
}

function applyLanguageToDom(language, rootNode = document.body) {
  if (!rootNode) return;
  if (rootNode.nodeType === Node.TEXT_NODE) {
    applyTranslationToTextNode(rootNode, language);
    return;
  }
  const rootElement = rootNode.nodeType === Node.ELEMENT_NODE ? rootNode : document.body;
  if (!rootElement) return;
  applyTranslationToElementAttrs(rootElement, language);
  const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    applyTranslationToTextNode(current, language);
    current = walker.nextNode();
  }
  const allElements = rootElement.querySelectorAll ? rootElement.querySelectorAll("*") : [];
  for (const element of allElements) {
    applyTranslationToElementAttrs(element, language);
  }
}

function enableI18nObserver(language) {
  if (typeof document === "undefined") return;
  if (i18nObserver) i18nObserver.disconnect();
  i18nObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const addedNode of mutation.addedNodes) {
        applyLanguageToDom(language, addedNode);
      }
      if (mutation.type === "characterData" && mutation.target) {
        applyTranslationToTextNode(mutation.target, language);
      }
    }
  });
  i18nObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function applyLanguage(language) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language === "hindi" ? "hi" : "en";
  applyLanguageToDom(language);
  enableI18nObserver(language);
}

function normalizeSettings(raw) {
  return {
    ...DEFAULT_APP_SETTINGS,
    ...(raw || {}),
  };
}

export function resolveTheme(themeValue) {
  if (themeValue === "system") {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  }
  return themeValue === "dark" ? "dark" : "light";
}

export function applyTheme(themeValue) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(themeValue);
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
}

export function useAppSettings() {
  const [settings, setSettingsState] = useState(() =>
    normalizeSettings(readJSON(APP_SETTINGS_KEY, DEFAULT_APP_SETTINGS))
  );

  const merged = useMemo(() => normalizeSettings(settings), [settings]);

  const setSettings = (next) => {
    const nextValue = typeof next === "function" ? next(merged) : next;
    const normalized = normalizeSettings(nextValue);
    setSettingsState(normalized);
    writeJSON(APP_SETTINGS_KEY, normalized);
    applyTheme(normalized.theme);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ec-settings-updated", { detail: normalized }));
    }
  };

  useEffect(() => {
    applyTheme(merged.theme);
  }, [merged.theme]);

  useEffect(() => {
    applyLanguage(merged.language);
    return () => {
      if (i18nObserver) i18nObserver.disconnect();
    };
  }, [merged.language]);

  useEffect(() => {
    const handleUpdated = (event) => {
      setSettingsState(normalizeSettings(event?.detail || readJSON(APP_SETTINGS_KEY, DEFAULT_APP_SETTINGS)));
    };
    const handleStorage = (event) => {
      if (event.key === APP_SETTINGS_KEY) {
        setSettingsState(normalizeSettings(readJSON(APP_SETTINGS_KEY, DEFAULT_APP_SETTINGS)));
      }
    };
    window.addEventListener("ec-settings-updated", handleUpdated);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("ec-settings-updated", handleUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return { settings: merged, setSettings };
}

export function t(language, englishText, hindiText) {
  return language === "hindi" ? hindiText : englishText;
}
