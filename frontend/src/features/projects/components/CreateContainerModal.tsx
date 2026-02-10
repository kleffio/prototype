import { useState, useEffect, type FormEvent } from "react";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { Button } from "@shared/ui/Button";
import { X, Plus, Trash2 } from "lucide-react";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
        envVariables: Object.keys(envVarsObject).length > 0 ? envVarsObject : undefined
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}

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
                className={inputBase}
                placeholder="my-container"
              />
            </div>

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
                className={inputBase}
                placeholder="8080"
              />
            </div>

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
                className={inputBase}
                placeholder="https://github.com/user/repo.git"
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
                className={inputBase}
                placeholder="main"
              />
            </div>

            {/* Environment Variables Section */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium tracking-wide text-neutral-300 uppercase">
                  {t.environment_variables}
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEnvVariables([...envVariables, { key: "", value: "" }])}
                  className="border-white/20 bg-white/5 text-xs text-neutral-200 hover:border-white/40 hover:bg-white/10"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  {t.add_variable}
                </Button>
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
                    className={`${inputBase} flex-1`}
                    placeholder={t.value}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const updated = envVariables.filter((_, i) => i !== index);
                      setEnvVariables(updated);
                    }}
                    className="border-red-500/40 bg-red-500/10 text-red-300 hover:border-red-500/60 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-white/20 bg-white/5 text-xs font-medium text-neutral-200 hover:border-white/40 hover:bg-white/10"
              >
                {t.cancel}
              </Button>
              <Button
                type="submit"
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
            </div>
          </form>
        </SoftPanel>
      </section>
    </section>
  );
}
