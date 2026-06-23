//store/useLanguageStore.ts
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Lang = "tl" | "en" | "pag";

interface LanguageState {
  lang: Lang;
  setLang: (lang: Lang) => Promise<void>;
  loadLang: () => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  lang: "tl",

  setLang: async (lang) => {
    await AsyncStorage.setItem("ka-agapay-lang", lang);
    set({ lang });
  },

  loadLang: async () => {
    const saved = await AsyncStorage.getItem("ka-agapay-lang");

    if (
      saved === "tl" ||
      saved === "en" ||
      saved === "pag"
    ) {
      set({ lang: saved });
    }
  },
}));