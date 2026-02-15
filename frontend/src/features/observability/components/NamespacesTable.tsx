import { Skeleton } from "@shared/ui/Skeleton";
import { Package } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { NamespaceMetric } from "../types/metrics";
import enTranslations from "@app/locales/en/dashboard.json";
import frTranslations from "@app/locales/fr/dashboard.json";
import { getLocale } from "@app/locales/locale";

const translations = { en: enTranslations, fr: frTranslations };

interface Props {
  namespaces: NamespaceMetric[];
  loading?: boolean;
}

export const NamespacesTable: React.FC<Props> = ({ namespaces, loading }) => {
  const [locale, setLocaleState] = useState(getLocale());

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) setLocaleState(currentLocale);
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].dashboard.namespaces;
  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-6">
        <div className="mb-5 flex items-center gap-3">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="space-y-3">
          <div className="flex gap-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Check if namespaces is an array
  if (!Array.isArray(namespaces) || namespaces.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-6">
        <div className="mb-5 flex items-center gap-3 text-white">
          <Package size={20} />
          <h3 className="text-lg font-semibold">{t.title}</h3>
        </div>
        <div className="py-5 text-center text-neutral-500">{t.no_data}</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-6">
      <div className="mb-5 flex items-center gap-3 text-white">
        <Package size={20} />
        <h3 className="text-lg font-semibold">{t.title}</h3>
      </div>

      <div className="max-h-[600px] overflow-x-auto overflow-y-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-neutral-700">
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase">
                {t.namespace}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase">
                {t.pods}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase">
                {t.cpu_usage}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase">
                {t.memory_usage}
              </th>
            </tr>
          </thead>
          <tbody>
            {namespaces.map((ns) => (
              <tr
                key={ns.name}
                className="border-b border-neutral-700 transition-colors duration-200 last:border-0 hover:bg-neutral-800"
              >
                <td className="px-4 py-4 text-sm font-semibold text-amber-400">{ns.name}</td>
                <td className="px-4 py-4 text-sm font-semibold text-white">{ns.podCount}</td>
                <td className="px-4 py-4 font-mono text-sm text-neutral-400">
                  {ns.cpuUsage?.toFixed(2) ?? "0.00"} cores
                </td>
                <td className="px-4 py-4 font-mono text-sm text-neutral-400">
                  {((ns.memoryUsage || 0) / 1024 / 1024).toFixed(0)} Mi
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
