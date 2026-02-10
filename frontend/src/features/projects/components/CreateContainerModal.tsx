import { useState, useEffect, type FormEvent } from "react";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { Button } from "@shared/ui/Button";
import { Switch } from "@shared/ui/Switch";
import { X, Plus, Trash2, Github, Loader2 } from "lucide-react";
import updateContainer from "@features/projects/api/updateContainer";
import type { Container } from "@features/projects/types/Container";
import createContainer from "@features/projects/api/createContainer";
import enTranslations from "@app/locales/en/projects.json";
import frTranslations from "@app/locales/fr/projects.json";
import { getLocale } from "@app/locales/locale";

const translations = {
  en: enTranslations,
  fr: frTranslations
};

interface ContainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess?: () => void;
  container?: Container | null; // Added: if null, we are creating. If object, we are editing.
}

export function ContainerModal({
  isOpen,
  onClose,
  projectId,
  onSuccess,
  container
}: ContainerModalProps) {
  const [name, setName] = useState("");
  const [port, setPort] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [envVariables, setEnvVariables] = useState<Array<{ key: string; value: string }>>([]);
  const [enableDatabase, setEnableDatabase] = useState(false);
  const [storageSizeGB, setStorageSizeGB] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [githubUsername, setGithubUsername] = useState("");
  const [repositories, setRepositories] = useState<{ id: number; name: string; clone_url: string; private: boolean }[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [step, setStep] = useState(1);
  const [locale, setLocale] = useState(getLocale());
  const t = translations[locale].containerModal;

  const isEditMode = !!container;

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) {
        setLocale(currentLocale);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  // Initialize fields if in edit mode
  useEffect(() => {
    if (container && isOpen) {
      setName(container.name || "");
      setPort(container.ports?.[0]?.toString() || "");
      setRepoUrl(container.repoUrl || "");
      setBranch(container.branch || "");

      if (container.envVariables) {
        const envs = Object.entries(container.envVariables).map(([key, value]) => ({ key, value }));
        setEnvVariables(envs);
      }

      setEnableDatabase(container.enableDatabase || false);
      setStorageSizeGB(container.storageSizeGB || 10);
    } else if (!isOpen) {
      resetForm();
    }
  }, [container, isOpen]);

  const resetForm = () => {
    setName("");
    setPort("");
    setRepoUrl("");
    setBranch("");
    setEnvVariables([]);
    setEnableDatabase(false);
    setStorageSizeGB(10);
    setError(null);
    setGithubUsername("");
    setRepositories([]);
    setStep(1);
  };

  const fetchGithubRepos = async () => {
    if (!githubUsername.trim()) return;
    setIsLoadingRepos(true);
    setError(null);
    try {
      const response = await fetch(`https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=100`);
      if (!response.ok) {
        throw new Error("Failed to fetch repositories");
      }
      const data = await response.json();
      setRepositories(data);
      if (data.length === 0) {
        setError(t.no_repos_found);
      }
    } catch {
      setError(t.no_repos_found);
      setRepositories([]);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleSelectRepo = (repo: { clone_url: string; name: string }) => {
    // Remove .git suffix if present
    const cleanUrl = repo.clone_url.replace(/\.git$/, '');
    setRepoUrl(cleanUrl);
    if (!name) {
      setName(repo.name);
    }
    setRepositories([]);
  };

  const handleNext = () => {
    if (step === 2 && !name.trim()) {
      setError(t.container_name_required);
      return;
    }
    if (step === 3) {
      const portNum = parseInt(port);
      if (isNaN(portNum) || portNum <= 0) {
        setError(t.port_required);
        return;
      }
    }
    setError(null);
    setStep(step + 1);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handleCreateContainer();
  };

  const handleCreateContainer = async () => {
    // Only handle container creation - step navigation is handled by individual step forms
    if (!name.trim()) {
      setError(t.container_name_required);
      return;
    }

    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum <= 0) {
      setError(t.port_required);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const envVarsObject = envVariables.reduce(
        (acc, { key, value }) => {
          if (key.trim()) acc[key.trim()] = value;
          return acc;
        },
        {} as Record<string, string>
      );

      const payload = {
        projectID: projectId,
        name: name.trim(),
        port: portNum,
        repoUrl: repoUrl.trim(),
        branch: branch.trim(),
        envVariables: Object.keys(envVarsObject).length > 0 ? envVarsObject : undefined,
        enableDatabase,
        storageSizeGB: enableDatabase ? storageSizeGB : undefined
      };

      if (isEditMode && container) {
        await updateContainer(container.containerId, payload);
      } else {
        await createContainer(payload);
      }

      onSuccess?.();
      onClose();
    } catch {
      setError(t.failed_save);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputBase =
    "w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-neutral-50 placeholder-neutral-500 " +
    "transition-colors hover:border-white/20 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/30";

  return (
    <section className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <section className="relative z-10 w-full max-w-lg px-4 sm:px-0">
        <SoftPanel className="border border-white/10 bg-black/70 shadow-2xl shadow-black/60">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-neutral-50">
                {isEditMode ? t.update_title : t.create_title}
              </h2>
              <p className="mt-1 text-xs text-neutral-400">
                {isEditMode ? t.update_subtitle : t.create_subtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-400 transition hover:border-white/30 hover:bg-white/10 hover:text-neutral-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${isEditMode || step >= s ? "bg-blue-500" : "bg-white/10"
                    } ${s !== 4 ? "mr-2" : ""}`}
                />
              ))}
            </div>
            {!isEditMode && (
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-medium">
                Step {step} of 4: {step === 1 ? "Repository" : step === 2 ? "Basic Info" : step === 3 ? "Config" : "Database"}
              </p>
            )}
          </div>

            {/* STEP 1: Repo Selection */}
            {(isEditMode || step === 1) && (
              <form id="step1-form" onSubmit={(e) => {
                e.preventDefault();
                handleNext();
              }} className="space-y-4">
                {error && (
                  <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {error}
                  </div>
                )}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="github-username"
                      className="block text-xs font-medium tracking-wide text-neutral-300 uppercase"
                    >
                      {t.github_username}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Github className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                        <input
                          id="github-username"
                          type="text"
                          value={githubUsername}
                          onChange={(e) => setGithubUsername(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              fetchGithubRepos();
                            }
                          }}
                          className={`${inputBase} pl-9`}
                          placeholder="octocat"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={fetchGithubRepos}
                        disabled={isLoadingRepos || !githubUsername.trim()}
                        className="border-white/20 bg-white/5 text-xs text-neutral-200 hover:border-white/40 hover:bg-white/10"
                      >
                        {isLoadingRepos ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          t.fetch_repos
                        )}
                      </Button>
                    </div>
                  </div>

                  {repositories.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium tracking-wide text-neutral-300 uppercase">
                        {t.select_repo}
                      </label>
                      <div className="max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-1">
                        {repositories.map((repo) => (
                          <button
                            key={repo.id}
                            type="button"
                            onClick={() => handleSelectRepo(repo)}
                            className="flex w-full items-center px-3 py-2 text-left text-sm text-neutral-300 transition hover:bg-white/5 hover:text-neutral-100"
                          >
                            <span className="truncate">{repo.name}</span>
                            {repo.private && (
                              <span className="ml-2 rounded bg-neutral-800 px-1 text-[10px] uppercase text-neutral-500">
                                Private
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label
                      htmlFor="container-repo-url"
                      className="block text-xs font-medium tracking-wide text-neutral-300 uppercase"
                    >
                      {t.repository_url}
                    </label>
                    <input
                      id="container-repo-url"
                      name="repoUrl"
                      type="text"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                        }
                      }}
                      className={inputBase}
                      placeholder="https://github.com/user/repo.git"
                    />
                  </div>
                </div>
              </form>
            )}

            {/* STEP 2: Container Info */}
            {(isEditMode || step === 2) && (
              <form id="step2-form" onSubmit={(e) => {
                e.preventDefault();
                handleNext();
              }} className="space-y-4">
                {error && (
                  <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {error}
                  </div>
                )}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="container-name"
                      className="block text-xs font-medium tracking-wide text-neutral-300 uppercase"
                    >
                      {t.container_name} <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="container-name"
                      name="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                        }
                      }}
                      className={inputBase}
                      placeholder="my-container"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="container-branch"
                      className="block text-xs font-medium tracking-wide text-neutral-300 uppercase"
                    >
                      {t.branch}
                    </label>
                    <input
                      id="container-branch"
                      name="branch"
                      type="text"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                        }
                      }}
                      className={inputBase}
                      placeholder="main"
                    />
                  </div>
                </div>
              </form>
            )}

            {/* STEP 3: Configuration */}
            {(isEditMode || step === 3) && (
              <form id="step3-form" onSubmit={(e) => {
                e.preventDefault();
                handleNext();
              }} className="space-y-4">
                {error && (
                  <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {error}
                  </div>
                )}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="container-port"
                      className="block text-xs font-medium tracking-wide text-neutral-300 uppercase"
                    >
                      {t.port} <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="container-port"
                      name="port"
                      type="number"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                        }
                      }}
                      className={inputBase}
                      placeholder="8080"
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium tracking-wide text-neutral-300 uppercase">
                        {t.environment_variables}
                      </label>
                      <button
                        type="button"
                        onClick={() => setEnvVariables([...envVariables, { key: "", value: "" }])}
                        className="inline-flex items-center rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-xs text-neutral-200 transition hover:border-white/40 hover:bg-white/10"
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        {t.add_variable}
                      </button>
                    </div>
                    {envVariables.length === 0 && (
                      <p className="text-xs text-neutral-500 italic">{t.no_env_vars}</p>
                    )}
                    {envVariables.map((envVar, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <input
                          type="text"
                          value={envVar.key}
                          onChange={(e) => {
                            const updated = [...envVariables];
                            updated[index].key = e.target.value;
                            setEnvVariables(updated);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                            }
                          }}
                          className={`${inputBase} flex-1`}
                          placeholder={t.key}
                        />
                        <input
                          type="text"
                          value={envVar.value}
                          onChange={(e) => {
                            const updated = [...envVariables];
                            updated[index].value = e.target.value;
                            setEnvVariables(updated);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                            }
                          }}
                          className={`${inputBase} flex-1`}
                          placeholder={t.value}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = envVariables.filter((_, i) => i !== index);
                            setEnvVariables(updated);
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 transition hover:border-red-500/60 hover:bg-red-500/20"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            )}

            {/* STEP 4: Database */}
            {(isEditMode || step === 4) && (
              <form id="step4-form" onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {error}
                  </div>
                )}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium tracking-wide text-neutral-300 uppercase">
                      {t.enable_database}
                    </label>
                    <Switch checked={enableDatabase} onCheckedChange={setEnableDatabase} />
                  </div>

                  {enableDatabase && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium tracking-wide text-neutral-300 uppercase">
                          {t.database_storage}
                        </label>
                        <p className="mt-1 text-xs text-neutral-500">
                          {t.database_storage_description}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={storageSizeGB}
                          onChange={(e) => setStorageSizeGB(parseInt(e.target.value))}
                          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-blue-500"
                        />
                        <div className="flex justify-between text-xs text-neutral-400">
                          <span>1 GB</span>
                          <span className="font-medium text-neutral-200">
                            {t.storage_gb.replace("{{size}}", storageSizeGB.toString())}
                          </span>
                          <span>100 GB</span>
                        </div>
                      </div>
                      <div className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2">
                        <p className="text-xs text-blue-200">{t.database_connection_info}</p>
                        <div className="mt-1 space-y-1">
                          {Object.entries(t.database_env_vars_examples).map(([key, value]) => (
                            <div
                              key={key}
                              className="flex items-center justify-between font-mono text-xs"
                            >
                              <span className="text-blue-100">{key}:</span>
                              <span className="text-blue-300">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            )}

            <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
              {!isEditMode && step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="border-white/20 bg-white/5 text-xs font-medium text-neutral-200 hover:border-white/40 hover:bg-white/10"
                >
                  {t.back || "Back"}
                </Button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="border-white/20 bg-white/5 text-xs font-medium text-neutral-200 hover:border-white/40 hover:bg-white/10"
                >
                  {t.cancel}
                </Button>

                {!isEditMode && step < 4 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="bg-gradient-kleff rounded-full px-5 py-2 text-xs font-semibold text-black shadow-md shadow-black/40 hover:brightness-110"
                  >
                    {t.next || "Next"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleCreateContainer}
                    disabled={isSubmitting}
                    className="bg-gradient-kleff rounded-full px-5 py-2 text-xs font-semibold text-black shadow-md shadow-black/40 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting
                      ? isEditMode
                        ? t.updating
                        : t.creating
                      : isEditMode
                        ? t.update_button
                        : t.create_button}
                  </Button>
                )}
              </div>
            </div>
        </SoftPanel>
      </section>
    </section>
  );
}
