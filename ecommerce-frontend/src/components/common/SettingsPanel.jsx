import { useState } from "react";
import { Settings } from "lucide-react";
import { t, useAppSettings } from "../../hooks/useAppSettings";

function OptionGroup({ label, options, value, onChange }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="text-[11px] font-black uppercase tracking-wide text-slate-600">{label}</div>
      <div className="mt-2 grid grid-cols-1 gap-1.5">
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`w-full rounded-lg border px-2.5 py-2 text-left text-sm font-bold transition ${
                active
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const { settings, setSettings } = useAppSettings();
  const lang = settings.language;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-900 hover:bg-slate-50"
      >
        <Settings size={14} />
        {t(lang, "Settings", "सेटिंग्स")}
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.15)]">
          <div className="text-sm font-black text-slate-950">{t(lang, "Dashboard Settings", "डैशबोर्ड सेटिंग्स")}</div>

          <div className="mt-3 space-y-3">
            <OptionGroup
              label={t(lang, "Language", "भाषा")}
              value={settings.language}
              onChange={(nextValue) => setSettings((prev) => ({ ...(prev || {}), language: nextValue }))}
              options={[
                { value: "english", label: t(lang, "English", "अंग्रेज़ी") },
                { value: "hindi", label: t(lang, "Hindi", "हिंदी") },
              ]}
            />

            <OptionGroup
              label={t(lang, "Theme", "थीम")}
              value={settings.theme}
              onChange={(nextValue) => setSettings((prev) => ({ ...(prev || {}), theme: nextValue }))}
              options={[
                { value: "light", label: t(lang, "Light", "लाइट") },
                { value: "dark", label: t(lang, "Dark", "डार्क") },
                { value: "system", label: t(lang, "System", "सिस्टम") },
              ]}
            />

            <OptionGroup
              label={t(lang, "Preferred Option", "पसंदीदा विकल्प")}
              value={settings.preferredOption}
              onChange={(nextValue) => setSettings((prev) => ({ ...(prev || {}), preferredOption: nextValue }))}
              options={[
                { value: "default", label: t(lang, "Default", "डिफ़ॉल्ट") },
                { value: "shopping", label: t(lang, "Shopping", "शॉपिंग") },
                { value: "orders", label: t(lang, "Orders", "ऑर्डर्स") },
                { value: "analytics", label: t(lang, "Analytics", "एनालिटिक्स") },
              ]}
            />
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-900 hover:bg-slate-50"
          >
            {t(lang, "Close", "बंद करें")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
