import { useState, useEffect, useMemo } from "react";
import { ChevronDown, Sparkles, Search, X } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { Section } from "@shared/ui/Section";
import { Badge } from "@shared/ui/Badge";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { getFaqData } from "@shared/config/faqData";
import enTranslations from "@app/locales/en/legal.json";
import frTranslations from "@app/locales/fr/legal.json";
import { getLocale } from "@app/locales/locale";

const translations = { en: enTranslations, fr: frTranslations };

export function FAQPage() {
  const [activeCategory, setActiveCategory] = useState("getting-started");
  const [openQuestion, setOpenQuestion] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [locale, setLocaleState] = useState(getLocale());

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) setLocaleState(currentLocale);
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].faq;
  const faqData = getFaqData(locale);

  // Filter FAQs based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return faqData;
    }

    const query = searchQuery.toLowerCase();
    return faqData
      .map((category) => ({
        ...category,
        questions: category.questions.filter(
          (q) => q.q.toLowerCase().includes(query) || q.a.toLowerCase().includes(query)
        )
      }))
      .filter((category) => category.questions.length > 0);
  }, [searchQuery, faqData]);

  // Get current category or first filtered category
  const currentCategory = useMemo(() => {
    if (searchQuery.trim()) {
      return filteredCategories[0];
    }
    return filteredCategories.find((c) => c.id === activeCategory) || filteredCategories[0];
  }, [activeCategory, filteredCategories, searchQuery]);

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setOpenQuestion(0);
  };

  return (
    <div className="relative isolate overflow-hidden">
      <Section className="flex flex-col items-center gap-8 px-4 pt-16 pb-12 text-center sm:gap-12 sm:pt-20 sm:pb-16">
        <div className="w-full max-w-3xl space-y-6">
          <Badge
            variant="gradient"
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium"
          >
            <Sparkles className="h-3 w-3" />
            <span>{t.badge}</span>
          </Badge>

          <div className="space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl xl:text-6xl">
              {t.title_line1}
              <br />
              <span className="text-gradient-kleff">{t.title_line2}</span>
            </h1>
            <p className="text-xs text-neutral-300 sm:text-sm">{t.subtitle}</p>
          </div>

          {/* Search Bar */}
          <div className="relative pt-2">
            <div className="relative">
              <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder={t.search_placeholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setOpenQuestion(0);
                }}
                className="w-full rounded-full border border-white/10 bg-black/50 px-11 py-3 text-sm text-neutral-100 transition-all placeholder:text-neutral-400 focus:border-white/20 focus:bg-black/60 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute top-1/2 right-4 -translate-y-1/2 text-neutral-400 transition-colors hover:text-neutral-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category Pills - Hide when searching */}
          {!searchQuery && (
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {faqData.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setOpenQuestion(0);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all",
                      isActive
                        ? "bg-gradient-kleff text-black shadow-sm shadow-black/40"
                        : "border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{cat.title}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Search Results Info */}
          {searchQuery && (
            <div className="text-xs text-neutral-400">
              {t.results_found}{" "}
              {filteredCategories.reduce((acc, cat) => acc + cat.questions.length, 0)}{" "}
              {t.results_for} &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>
      </Section>

      <Section className="px-4 pb-16">
        <div className="mx-auto max-w-3xl">
          {filteredCategories.length === 0 ? (
            <div className="glass-panel p-12 text-center">
              <div className="mb-4 text-4xl">🔍</div>
              <h3 className="mb-2 text-lg font-semibold text-white">{t.no_results_title}</h3>
              <p className="mb-6 text-sm text-neutral-400">{t.no_results_description}</p>
              <button
                onClick={clearSearch}
                className="bg-gradient-kleff inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-black shadow-md shadow-black/40 transition-all hover:brightness-110"
              >
                {t.clear_search}
              </button>
            </div>
          ) : (
            <>
              {searchQuery ? (
                // Show all matching questions across categories when searching
                <div className="space-y-6">
                  {filteredCategories.map((category) => (
                    <div key={category.id}>
                      <div className="mb-3 flex items-center gap-2 px-1">
                        <category.icon className="text-kleff-primary h-4 w-4" />
                        <h2 className="text-sm font-semibold text-neutral-200">{category.title}</h2>
                      </div>
                      <div className="glass-panel p-3">
                        <div className="space-y-2">
                          {category.questions.map((q, idx) => {
                            const globalIdx = `${category.id}-${idx}`;
                            const isOpen = openQuestion === idx && activeCategory === category.id;
                            return (
                              <div
                                key={globalIdx}
                                className={cn(
                                  "rounded-lg border border-white/10 transition-all",
                                  isOpen ? "bg-black/60" : "bg-black/40 hover:bg-black/50"
                                )}
                              >
                                <button
                                  onClick={() => {
                                    setActiveCategory(category.id);
                                    setOpenQuestion(isOpen ? null : idx);
                                  }}
                                  className="flex w-full items-center justify-between gap-3 p-3 text-left sm:gap-4 sm:p-4"
                                >
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="bg-gradient-kleff flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-black sm:h-6 sm:w-6 sm:text-[11px]">
                                      {idx + 1}
                                    </div>
                                    <h3 className="text-xs font-semibold text-neutral-50 sm:text-sm">
                                      {q.q}
                                    </h3>
                                  </div>
                                  <ChevronDown
                                    className={cn(
                                      "text-kleff-primary h-4 w-4 flex-shrink-0 transition-transform",
                                      isOpen && "rotate-180"
                                    )}
                                  />
                                </button>
                                {isOpen && (
                                  <div className="border-t border-white/10 px-3 pt-2 pb-3 sm:px-4 sm:pt-3 sm:pb-4">
                                    <p className="text-[11px] leading-relaxed text-neutral-300 sm:text-xs">
                                      {q.a}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Show single category when not searching
                currentCategory && (
                  <div className="glass-panel p-3">
                    <div className="space-y-2">
                      {currentCategory.questions.map((q, idx) => {
                        const isOpen = openQuestion === idx;
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "rounded-lg border border-white/10 transition-all",
                              isOpen ? "bg-black/60" : "bg-black/40 hover:bg-black/50"
                            )}
                          >
                            <button
                              onClick={() => setOpenQuestion(isOpen ? null : idx)}
                              className="flex w-full items-center justify-between gap-3 p-3 text-left sm:gap-4 sm:p-4"
                            >
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="bg-gradient-kleff flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-black sm:h-6 sm:w-6 sm:text-[11px]">
                                  {idx + 1}
                                </div>
                                <h3 className="text-xs font-semibold text-neutral-50 sm:text-sm">
                                  {q.q}
                                </h3>
                              </div>
                              <ChevronDown
                                className={cn(
                                  "text-kleff-primary h-4 w-4 flex-shrink-0 transition-transform",
                                  isOpen && "rotate-180"
                                )}
                              />
                            </button>
                            {isOpen && (
                              <div className="border-t border-white/10 px-3 pt-2 pb-3 sm:px-4 sm:pt-3 sm:pb-4">
                                <p className="text-[11px] leading-relaxed text-neutral-300 sm:text-xs">
                                  {q.a}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </Section>

      <Section className="px-4 pb-16">
        <div className="mx-auto max-w-2xl text-center">
          <SoftPanel className="p-6 sm:p-8">
            <h2 className="mb-3 text-xl font-semibold text-white sm:text-2xl">
              {t.still_have_questions}
            </h2>
            <p className="mb-4 text-[11px] text-neutral-300 sm:mb-6 sm:text-xs">{t.team_help}</p>
            <a
              href="mailto:support@kleff.ca"
              className="bg-gradient-kleff inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold text-black shadow-md shadow-black/40 transition-all hover:brightness-110 sm:px-6 sm:py-2.5 sm:text-sm"
            >
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {t.contact_support}
            </a>
          </SoftPanel>
        </div>
      </Section>
    </div>
  );
}
