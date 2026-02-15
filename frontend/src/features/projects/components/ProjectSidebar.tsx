import { useState, useEffect, useCallback, useRef } from "react";
import { Box, Layers, Activity, DollarSign, Settings } from "lucide-react";
import { cn } from "@shared/lib/utils";

interface SidebarSection {
  id: string;
  label: string;
  icon: React.ElementType;
  disabled?: boolean;
}

const SECTIONS: SidebarSection[] = [
  { id: "overview", label: "Overview", icon: Box },
  { id: "usage", label: "Usage", icon: Activity },
  { id: "billing", label: "Billing", icon: DollarSign },
  { id: "containers", label: "Containers", icon: Layers },
  { id: "settings", label: "Settings", icon: Settings, disabled: true }
];

interface ProjectSidebarProps {
  className?: string;
}

export function ProjectSidebar({ className }: ProjectSidebarProps) {
  const [activeSection, setActiveSection] = useState("overview");
  const isScrollingRef = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleClick = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      isScrollingRef.current = true;
      setActiveSection(sectionId);
      element.scrollIntoView({ behavior: "smooth", block: "start" });

      // Clear any existing timer and set a new one
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 800);
    }
  }, []);

  useEffect(() => {
    const scrollContainer = document.querySelector("main");
    if (!scrollContainer) return;

    const handleScroll = () => {
      // Skip scroll-based detection while a click-scroll is in progress
      if (isScrollingRef.current) return;

      const sectionIds = SECTIONS.filter((s) => !s.disabled).map((s) => s.id);
      let current = sectionIds[0];

      // Check if user has scrolled near the bottom of the container
      const isNearBottom =
        scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight <
        100;

      if (isNearBottom) {
        // If near bottom, activate the last enabled section
        current = sectionIds[sectionIds.length - 1];
      } else {
        for (const id of sectionIds) {
          const el = document.getElementById(id);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 120) {
              current = id;
            }
          }
        }
      }

      setActiveSection(current);
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={cn("w-44 shrink-0 flex-col gap-1", className)}>
      <div className="sticky top-8">
        <p className="mb-3 text-[11px] font-medium tracking-[0.16em] text-neutral-500 uppercase">
          Project
        </p>
        <div className="space-y-1">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            if (section.disabled) {
              return (
                <div
                  key={section.id}
                  className="group relative flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 opacity-40"
                >
                  <div className="flex h-6 w-6 items-center justify-center">
                    <Icon className="h-4 w-4 shrink-0 text-neutral-500" />
                  </div>
                  <span className="text-sm font-medium text-neutral-500">{section.label}</span>
                </div>
              );
            }

            return (
              <button
                key={section.id}
                onClick={() => handleClick(section.id)}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-md px-3 py-2 transition-all",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-neutral-400 hover:bg-white/5 hover:text-white/90"
                )}
              >
                {isActive && (
                  <span className="absolute top-0 left-0 h-full w-0.5 rounded-r bg-linear-to-b from-[#FFD56A] to-[#B8860B] shadow-[0_0_6px_2px_rgba(255,213,106,0.35)]" />
                )}
                <div className="flex h-6 w-6 items-center justify-center">
                  <Icon className="h-4 w-4 shrink-0" />
                </div>
                <span className="text-sm font-medium">{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
