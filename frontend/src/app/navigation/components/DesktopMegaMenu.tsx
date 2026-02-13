import enTranslations from "@app/locales/en/components.json";
import frTranslations from "@app/locales/fr/components.json";

import { useState, useEffect } from "react";
import { getLocale } from "@app/locales/locale";

import { memo } from "react";
import { Link } from "react-router-dom";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from "./NavigationMenu";
import { UnderlineLink } from "@shared/ui/UnderlineLink";
import { getMegaMenuSections, getSimpleNavLinks } from "@app/navigation/Navigation";
import { cn } from "@shared/lib/utils";
import type { MegaMenuSection } from "@app/navigation/Navigation";

const translations = {
  en: enTranslations,
  fr: frTranslations
} as const;

type Translations = typeof translations;
type TranslationHeader = Translations[keyof Translations]["header"];

export function DesktopMegaMenu() {
  const [locale, setLocaleState] = useState(getLocale());

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) {
        setLocaleState(currentLocale);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].header;
  const megaMenuSections = getMegaMenuSections(locale);
  const simpleNavLinks = getSimpleNavLinks(locale);

  return (
    <NavigationMenu>
      <NavigationMenuList className="flex items-center gap-1 text-sm">
        {megaMenuSections.map((section) => (
          <NavigationMenuItem key={section.key}>
            <NavigationMenuTrigger
              className={cn(
                "text-muted relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150",
                "hover:text-foreground data-[state=open]:text-foreground hover:bg-white/5 data-[state=open]:bg-white/5"
              )}
            >
              {section.label}
            </NavigationMenuTrigger>

            <NavigationMenuContent className="p-4">
              {section.key === "product" ? (
                <ProductMegaMenu section={section} t={t} />
              ) : (
                <DefaultMegaMenu section={section} t={t} />
              )}
            </NavigationMenuContent>
          </NavigationMenuItem>
        ))}

        {simpleNavLinks.map((link) => (
          <NavigationMenuItem key={link.href}>
            <NavigationMenuLink asChild>
              <UnderlineLink
                href={link.href}
                className="text-muted rounded-full px-4 py-1.5 text-sm font-medium hover:bg-white/5"
              >
                {link.label}
              </UnderlineLink>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

interface ProductMegaMenuProps {
  section: MegaMenuSection;
  t: TranslationHeader;
}

const ProductMegaMenu = memo(({ section, t }: ProductMegaMenuProps) => {
  const p = t.product;

  return (
    <div className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,2.1fr)] gap-8 py-5 md:w-[680px] lg:w-[840px]">
      <div className="flex flex-col gap-4">
        <MenuSectionHeader label={p.label} tagline={p.tagline} />

        <div className="space-y-1.5">
          {section.items.map((item) => {
            const Icon = item.icon;

            return (
              <NavigationMenuLink asChild key={item.label}>
                <Link
                  to={item.href}
                  className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-white/4"
                >
                  <div className="text-muted-foreground group-hover:text-primary mt-0.5 flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-black/40">
                    <Icon className="h-4 w-4" />
                  </div>

                  <MenuItemContent label={item.label} description={item.description} />
                </Link>
              </NavigationMenuLink>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <InfoCard
          title={p.customer_stories.header}
          heading={p.customer_stories.title}
          description={p.customer_stories.description}
        />

        <InfoCard
          title={p.compare.header}
          items={[p.compare.vs_vercel, p.compare.vs_amplify, p.compare.vs_kubernetes]}
        />
      </div>
    </div>
  );
});

ProductMegaMenu.displayName = "ProductMegaMenu";

interface DefaultMegaMenuProps {
  section: MegaMenuSection;
  t: TranslationHeader;
}

const DefaultMegaMenu = memo(({ section, t }: DefaultMegaMenuProps) => {
  const s = t[section.key as keyof Omit<TranslationHeader, "common" | "links" | "mobile">];

  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 py-4 md:w-[520px] lg:w-[640px]">
      <div className="flex flex-col justify-between gap-4 pr-6">
        <MenuSectionHeader label={s.label} tagline={s.tagline} />

        <p className="text-muted-foreground/80 text-[11px]">{t.common.mega_menu_footer}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {section.items.map((item) => {
          const Icon = item.icon;

          return (
            <NavigationMenuLink asChild key={item.label}>
              <Link
                to={item.href}
                className="group relative flex items-start gap-3 rounded-xl border border-white/6 bg-black/30 px-3 py-2.5 transition-colors duration-150 hover:bg-white/5"
              >
                <div className="text-muted-foreground group-hover:text-primary mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/5">
                  <Icon className="h-4 w-4" />
                </div>

                <MenuItemContent label={item.label} description={item.description} size="sm" />
              </Link>
            </NavigationMenuLink>
          );
        })}
      </div>
    </div>
  );
});

DefaultMegaMenu.displayName = "DefaultMegaMenu";

interface MenuSectionHeaderProps {
  label: string;
  tagline: string;
}

function MenuSectionHeader({ label, tagline }: MenuSectionHeaderProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-foreground text-sm font-semibold">{label}</p>
      <p className="text-muted-foreground/90 text-sm">{tagline}</p>
    </div>
  );
}

interface MenuItemContentProps {
  label: string;
  description: string;
  size?: "sm" | "md";
}

function MenuItemContent({ label, description, size = "md" }: MenuItemContentProps) {
  const labelSize = size === "sm" ? "text-xs" : "text-sm";
  const descSize = size === "sm" ? "text-[11px]" : "text-[12px]";

  return (
    <div className={size === "sm" ? "space-y-1" : "space-y-0.5"}>
      <div className={`text-foreground ${labelSize} font-medium`}>{label}</div>
      <div className={`text-muted-foreground ${descSize} leading-snug`}>{description}</div>
    </div>
  );
}

interface InfoCardProps {
  title: string;
  heading?: string;
  description?: string;
  items?: string[];
}

function InfoCard({ title, heading, description, items }: InfoCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 px-4 py-3",
        items ? "bg-black/25" : "bg-black/40"
      )}
    >
      <div
        className={cn(
          "text-[12px] font-semibold tracking-wide uppercase",
          items ? "text-muted-foreground/80 text-[11px] tracking-[0.18em]" : "text-muted"
        )}
      >
        {title}
      </div>

      {heading && <div className="text-foreground mt-2 text-sm font-medium">{heading}</div>}
      {description && (
        <p className="text-muted-foreground mt-1 text-[11px] leading-snug">{description}</p>
      )}

      {items && (
        <ul className="text-muted-foreground mt-2 space-y-1.5 text-[12px]">
          {items.map((item: string, i: number) => (
            <li key={i}>• {item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
