import { useState, useEffect, type FormEvent } from "react";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { Button } from "@shared/ui/Button";
import { X } from "lucide-react";

import createProject from "@features/projects/api/createProject";
import enTranslations from "@app/locales/en/projects.json";
import frTranslations from "@app/locales/fr/projects.json";
import { getLocale } from "@app/locales/locale";

const translations = { en: enTranslations, fr: frTranslations };

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locale, setLocaleState] = useState(getLocale());

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) setLocaleState(currentLocale);
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].projectModal;

  if (!isOpen) return null;

  const resetForm = () => {
    setName("");
    setDescription("");
    setError(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t.name_required);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createProject({
        name: name.trim(),
        description: description.trim() || undefined
      });

      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError(t.failed_create);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBase =
    "w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-neutral-50 placeholder-neutral-500 " +
    "transition-colors hover:border-white/20 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/30";

  return (
    <section
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="create-project-modal"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <section className="relative z-10 w-full max-w-lg px-4 sm:px-0">
        <SoftPanel className="border border-white/10 bg-black/70 shadow-2xl shadow-black/60">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-neutral-50">{t.title}</h2>
              <p className="mt-1 text-xs text-neutral-400">{t.subtitle}</p>
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
                htmlFor="project-name"
                className="block text-xs font-medium tracking-wide text-neutral-300 uppercase"
              >
                {t.project_name} <span className="text-red-400">*</span>
              </label>
              <input
                id="project-name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputBase}
                placeholder={t.project_name_placeholder}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="project-description"
                className="block text-xs font-medium tracking-wide text-neutral-300 uppercase"
              >
                {t.description}
              </label>
              <textarea
                id="project-description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${inputBase} min-h-20 resize-y`}
                placeholder={t.description_placeholder}
              />
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
                {isSubmitting ? t.creating : t.create_button}
              </Button>
            </div>
          </form>
        </SoftPanel>
      </section>
    </section>
  );
}
