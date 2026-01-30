import { Link } from "react-router-dom";
import enTranslations from "@app/locales/en/projects.json";
import frTranslations from "@app/locales/fr/projects.json";
import { getLocale } from "@app/locales/locale";
import { CreateProjectModal } from "@features/projects/components/CreateProjectModal";
import { PendingInvitations } from "@features/projects/components/PendingInvitations";
import { useProjects } from "@features/projects/hooks/useProjects";

import { Button } from "@shared/ui/Button";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { Badge } from "@shared/ui/Badge";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "react-oidc-context";
import type { Project } from "@features/projects/types/Project";
import {
  Bell,
  X,
  FolderKanban,
  Sparkles,
  Users,
  Clock,
  Search,
  Filter,
  Crown,
  UserCheck,
  Zap
} from "lucide-react";
import { getMyInvitations } from "@features/projects/api/invitations";
import { Spinner } from "@shared/ui/Spinner";

const translations = {
  en: enTranslations,
  fr: frTranslations
};

type SortOption = "date-desc" | "date-asc" | "name-asc" | "name-desc";
type FilterOption = "all" | "owned" | "shared";

export function ProjectsPage() {
  

  
  const [locale, setLocaleState] = useState(getLocale());
  const { projects, isLoading, error, reload } = useProjects();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [invitationCount, setInvitationCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [showFilters, setShowFilters] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) {
        setLocaleState(currentLocale);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].projects;
  const tModal = translations[locale].projectModal;
  const tNotifications = translations[locale].notifications;

  const currentUserId = auth.user?.profile?.sub;

  useEffect(() => {
    const loadInvitationCount = async () => {
      try {
        const invitations = await getMyInvitations();
        const pendingCount = (invitations || []).filter((inv) => inv.status === "PENDING").length;
        setInvitationCount(pendingCount);
      } catch (error) {
        console.error("Failed to load invitation count:", error);
      }
    };

    loadInvitationCount();
    const interval = setInterval(loadInvitationCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void reload();
      }
    };

    const handleFocus = () => {
      void reload();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [reload]);

  const { ownedProjects, collaboratedProjects } = useMemo(() => {
    const owned: Project[] = [];
    const collaborated: Project[] = [];

    projects.forEach((project) => {
      if (project.ownerId === currentUserId) {
        owned.push(project);
      } else {
        collaborated.push(project);
      }
    });

    return { ownedProjects: owned, collaboratedProjects: collaborated };
  }, [projects, currentUserId]);

  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects;

    if (filterBy === "owned") {
      filtered = ownedProjects;
    } else if (filterBy === "shared") {
      filtered = collaboratedProjects;
    }

    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime();
        case "date-asc":
          return new Date(a.createdDate || 0).getTime() - new Date(b.createdDate || 0).getTime();
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [projects, ownedProjects, collaboratedProjects, searchQuery, sortBy, filterBy]);

  const dateLocale = locale === "fr" ? "fr-CA" : "en-US";

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" });
  };

  const getRelativeTime = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return t.time.today;
    if (diffInDays === 1) return t.time.yesterday;
    if (diffInDays < 7) return t.time.days_ago.replace("{{count}}", String(diffInDays));
    if (diffInDays < 30)
      return t.time.weeks_ago.replace("{{count}}", String(Math.floor(diffInDays / 7)));
    return formatDate(dateString);
  };

  const handleCreateSuccess = () => {
    void reload();
    setIsModalOpen(false);
  };

  const ProjectCard = ({ project, isOwner }: { project: Project; isOwner: boolean }) => (
    <Link
      to={`/dashboard/projects/${project.projectId}`}
      className="group relative block outline-none focus:outline-none focus-visible:outline-none"
    >
      <div className="relative h-full rounded-2xl p-px">
        <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
          <div className="from-kleff-primary/70 to-kleff-primary/20 absolute inset-0 rounded-2xl bg-linear-to-br via-amber-400/40" />
        </div>

        <div
          className={[
            "relative h-full overflow-hidden rounded-2xl",
            "bg-linear-to-br from-neutral-900/80 to-neutral-900/45",
            "transition-all duration-300",
            "border border-neutral-800/60",
            "group-hover:border-transparent",
            "group-hover:-translate-y-0.5",
            "group-hover:shadow-[0_24px_70px_-45px_rgba(245,158,11,0.55)]",
            "outline-none focus:outline-none focus-visible:outline-none"
          ].join(" ")}
        >
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
            <div className="bg-kleff-primary/12 absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl" />
            <div className="from-kleff-primary/5 absolute inset-0 bg-linear-to-br via-transparent to-transparent" />
          </div>

          <div className="via-kleff-primary/45 pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" />

          <div className="relative space-y-4 p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="bg-kleff-primary/10 ring-kleff-primary/20 group-hover:ring-kleff-primary/35 rounded-lg p-2 ring-1 transition-all">
                  <FolderKanban className="text-kleff-primary h-4 w-4" />
                </div>

                <Badge
                  variant={isOwner ? "gradient" : "outline"}
                  className="px-2.5 py-0.5 text-[11px] font-semibold"
                >
                  {isOwner ? translations[locale].teamModal.roles.OWNER : t.collaborator_badge}
                </Badge>
              </div>
            </div>

            <div>
              <h3 className="group-hover:text-kleff-primary-soft line-clamp-1 text-lg font-bold text-neutral-50 transition-colors">
                {project.name}
              </h3>
              <p className="mt-1.5 line-clamp-2 min-h-10 text-sm leading-relaxed text-neutral-400">
                {project.description || (
                  <span className="italic opacity-60">{t.no_description}</span>
                )}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-3">
              <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                <Clock className="h-3.5 w-3.5" />
                <span>{getRelativeTime(project.createdDate)}</span>
              </div>

              {project.projectStatus && (
                <Badge variant="success" className="px-2 py-0.5 text-[10px]">
                  <Zap className="mr-1 h-2.5 w-2.5" />
                  {t.status.active}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );

  const projectCountLabel = (count: number) => {
    return locale === "fr"
      ? count === 1
        ? "projet"
        : "projets"
      : count === 1
        ? "project"
        : "projects";
  };

  const pendingLabel = (count: number) => {
    return count === 1 ? tNotifications.pending_invitation : tNotifications.pending_invitations;
  };

  return (
    <section className="min-h-screen" data-testid="projects-page">
      <div className="app-container space-y-6 py-8">
        <header className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-kleff-primary/10 ring-kleff-primary/20 rounded-xl p-2.5 ring-1">
                <Sparkles className="text-kleff-primary h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-50">{t.title}</h1>
                <p className="text-sm text-neutral-400">{t.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="relative rounded-xl border border-white/10 bg-white/5 p-2.5 transition-all hover:border-white/20 hover:bg-white/10"
              >
                <Bell className="h-4 w-4 text-neutral-300" />
                {invitationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {invitationCount > 9 ? "9+" : invitationCount}
                  </span>
                )}
              </button>

              <Button
                size="lg"
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-kleff shadow-kleff-primary/20 hover:shadow-kleff-primary/40 rounded-xl px-5 py-2 text-sm font-bold text-black shadow-lg transition-all"
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                {tModal.title}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SoftPanel className="bg-linear-to-br from-neutral-900/60 to-neutral-900/30 p-4">
              <div className="flex items-center gap-3">
                <div className="bg-kleff-primary/10 ring-kleff-primary/20 rounded-xl p-2.5 ring-1">
                  <FolderKanban className="text-kleff-primary h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500">{t.stats.total_projects}</p>
                  <p className="text-xl font-bold text-neutral-50">{projects.length}</p>
                </div>
              </div>
            </SoftPanel>

            <SoftPanel className="bg-linear-to-br from-amber-900/20 to-neutral-900/30 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-500/10 p-2.5 ring-1 ring-amber-500/20">
                  <Users className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500">{t.stats.collaborations}</p>
                  <p className="text-xl font-bold text-neutral-50">{collaboratedProjects.length}</p>
                </div>
              </div>
            </SoftPanel>

            <SoftPanel className="bg-linear-to-br from-emerald-900/20 to-neutral-900/30 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-2.5 ring-1 ring-emerald-500/20">
                  <Crown className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500">{t.stats.owned_projects}</p>
                  <p className="text-xl font-bold text-neutral-50">{ownedProjects.length}</p>
                </div>
              </div>
            </SoftPanel>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[250px] flex-1">
              <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder={t.search_placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="focus:border-kleff-primary/50 focus:ring-kleff-primary/20 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-4 pl-10 text-sm text-neutral-200 placeholder-neutral-500 transition-all focus:ring-2 focus:outline-none"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                showFilters
                  ? "border-kleff-primary/30 bg-kleff-primary/10 text-kleff-primary"
                  : "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10"
              }`}
            >
              <Filter className="h-4 w-4" />
              {t.filters.button}
            </button>
          </div>

          {showFilters && (
            <SoftPanel className="space-y-4 p-4">
              <div className="space-y-2">
                <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                  {t.filters.show_label}
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      value: "all" as FilterOption,
                      label: t.filters.all_projects,
                      icon: FolderKanban
                    },
                    { value: "owned" as FilterOption, label: t.my_projects, icon: Crown },
                    { value: "shared" as FilterOption, label: t.filters.shared, icon: UserCheck }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setFilterBy(option.value)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        filterBy === option.value
                          ? "bg-kleff-primary/15 text-kleff-primary ring-kleff-primary/30 ring-1"
                          : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-300"
                      }`}
                    >
                      <option.icon className="h-3.5 w-3.5" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                  {t.filters.sort_by_label}
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "date-desc", label: t.sort.newest },
                    { value: "date-asc", label: t.sort.oldest },
                    { value: "name-asc", label: t.sort.name_asc },
                    { value: "name-desc", label: t.sort.name_desc }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value as SortOption)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        sortBy === option.value
                          ? "bg-kleff-primary/15 text-kleff-primary ring-kleff-primary/30 ring-1"
                          : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </SoftPanel>
          )}
        </header>

        {isNotificationOpen && (
          <div
            className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setIsNotificationOpen(false)}
          >
            <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
              <div className="rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 p-5">
                  <div className="flex items-center gap-3">
                    <div className="bg-kleff-primary/10 ring-kleff-primary/20 rounded-xl p-2 ring-1">
                      <Bell className="text-kleff-primary h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-neutral-50">
                        {tNotifications.header_title}
                      </h2>
                      <p className="text-xs text-neutral-400">
                        {invitationCount > 0
                          ? `${invitationCount} ${pendingLabel(invitationCount)}`
                          : tNotifications.no_new_notifications}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsNotificationOpen(false)}
                    className="rounded-lg p-2 transition-colors hover:bg-white/10"
                  >
                    <X className="h-5 w-5 text-neutral-400" />
                  </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto p-5">
                  <PendingInvitations
                    onUpdate={() => {
                      getMyInvitations().then((invitations) => {
                        const pendingCount = (invitations || []).filter(
                          (inv) => inv.status === "PENDING"
                        ).length;
                        setInvitationCount(pendingCount);
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <SoftPanel>
            <div className="flex flex-col items-center justify-center py-20">
              <Spinner />
              <p className="mt-4 text-sm text-neutral-400">{t.loading}</p>
            </div>
          </SoftPanel>
        )}

        {!isLoading && error && (
          <SoftPanel className="border-red-500/20 bg-red-500/5 p-8 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </SoftPanel>
        )}

        {!isLoading && !error && projects.length === 0 && (
          <SoftPanel className="p-12 text-center">
            <div className="bg-kleff-primary/10 ring-kleff-primary/20 mx-auto mb-6 w-fit rounded-2xl p-6 ring-1">
              <FolderKanban className="text-kleff-primary h-12 w-12" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-neutral-50">
              {t.empty.no_projects_yet_title}
            </h3>
            <p className="mb-6 text-sm text-neutral-400">{t.no_projects}</p>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-kleff shadow-kleff-primary/20 rounded-xl px-6 py-2.5 text-sm font-bold text-black shadow-lg"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {t.create_first}
            </Button>
          </SoftPanel>
        )}

        {!isLoading && !error && filteredAndSortedProjects.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-kleff h-8 w-1 rounded-full" />
              <div>
                <h2 className="text-lg font-bold text-neutral-50">
                  {filterBy === "all" && t.filters.all_projects}
                  {filterBy === "owned" && t.my_projects}
                  {filterBy === "shared" && t.shared_with_me}
                </h2>
                <p className="text-xs text-neutral-500">
                  {filteredAndSortedProjects.length}{" "}
                  {projectCountLabel(filteredAndSortedProjects.length)}
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredAndSortedProjects.map((p) => (
                <ProjectCard key={p.projectId} project={p} isOwner={p.ownerId === currentUserId} />
              ))}
            </div>
          </div>
        )}

        {!isLoading && !error && projects.length > 0 && filteredAndSortedProjects.length === 0 && (
          <SoftPanel className="p-12 text-center">
            <p className="text-sm text-neutral-400">
              {t.empty.no_projects_found}
              {searchQuery && (
                <>
                  {" "}
                  {t.empty.matching} "
                  <span className="font-semibold text-neutral-300">{searchQuery}</span>"
                </>
              )}
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setFilterBy("all");
              }}
              className="text-kleff-primary hover:text-kleff-primary-soft mt-4 text-sm transition-colors"
            >
              {t.empty.clear_filters}
            </button>
          </SoftPanel>
        )}
      </div>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </section>
  );
}
