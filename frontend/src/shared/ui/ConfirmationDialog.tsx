import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shared/lib/utils";
import { Button } from "./Button";
import { X, AlertTriangle, CheckCircle, Ban } from "lucide-react";
import enTranslations from "@app/locales/en/components.json";
import frTranslations from "@app/locales/fr/components.json";
import { getLocale } from "@app/locales/locale";

const dialogVariants = cva("fixed z-50 gap-4 bg-background p-6 shadow-lg", {
  variants: {
    size: {
      sm: "w-full max-w-sm",
      md: "w-full max-w-md",
      lg: "w-full max-w-lg"
    }
  },
  defaultVariants: {
    size: "md"
  }
});

interface ConfirmationDialogProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>,
    VariantProps<typeof dialogVariants> {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: "destructive" | "warning" | "info";
  isLoading?: boolean;
  children?: React.ReactNode;
  hideIcon?: boolean;
  confirmDisabled?: boolean;
}

const ConfirmationDialog = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ConfirmationDialogProps
>(
  (
    {
      title,
      description,
      confirmText,
      cancelText,
      onConfirm,
      onCancel,
      variant = "destructive",
      isLoading = false,
      children,
      hideIcon = false,
      confirmDisabled = false,
      size = "md",
      ...props
    },
    ref
  ) => {
    const [isConfirming, setIsConfirming] = React.useState(false);
    const [locale, setLocaleState] = React.useState(getLocale());
    React.useEffect(() => {
      const interval = setInterval(() => {
        const currentLocale = getLocale();
        if (currentLocale !== locale) setLocaleState(currentLocale);
      }, 100);
      return () => clearInterval(interval);
    }, [locale]);
    const tDialog = { en: enTranslations, fr: frTranslations }[locale].confirmationDialog;
    const actualConfirmText = confirmText ?? tDialog.confirm;
    const actualCancelText = cancelText ?? tDialog.cancel;

    const handleConfirm = async () => {
      if (isLoading || isConfirming || confirmDisabled) return;

      setIsConfirming(true);
      try {
        await onConfirm();
      } finally {
        setIsConfirming(false);
      }
    };

    const handleCancel = () => {
      if (onCancel) onCancel();
    };

    const getIcon = () => {
      switch (variant) {
        case "destructive":
          return <AlertTriangle className="h-6 w-6 text-red-400" />;
        case "warning":
          return <AlertTriangle className="h-6 w-6 text-amber-400" />;
        case "info":
          return <CheckCircle className="h-6 w-6 text-blue-400" />;
        default:
          return <AlertTriangle className="h-6 w-6 text-red-400" />;
      }
    };

    const getConfirmButtonVariant = () => {
      switch (variant) {
        case "destructive":
          return "destructive";
        case "warning":
          return "secondary";
        case "info":
          return "default";
        default:
          return "destructive";
      }
    };

    return (
      <DialogPrimitive.Root {...props}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md" />
          <DialogPrimitive.Content
            ref={ref}
            className={cn(
              dialogVariants({ size }),
              "fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-black/70 shadow-2xl shadow-black/60"
            )}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-start gap-3">
                {!hideIcon && <div className="mt-0.5 flex-shrink-0">{getIcon()}</div>}
                <div>
                  <DialogPrimitive.Title className="text-lg font-semibold text-white">
                    {title}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="mt-1 text-sm text-neutral-300">
                    {description}
                  </DialogPrimitive.Description>
                  {children}
                </div>
              </div>
              <DialogPrimitive.Close className="ring-offset-background inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-400 opacity-70 transition-all hover:bg-white/10 hover:text-neutral-200 hover:opacity-100 focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={isConfirming}
                className="border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-neutral-100"
              >
                <Ban className="mr-2 h-4 w-4" />
                {actualCancelText}
              </Button>
              <Button
                variant={getConfirmButtonVariant()}
                onClick={handleConfirm}
                disabled={isLoading || isConfirming || confirmDisabled}
                className={variant === "destructive" ? "bg-red-600 hover:bg-red-700" : ""}
              >
                {isConfirming && <CheckCircle className="mr-2 h-4 w-4 animate-pulse" />}
                {isConfirming ? tDialog.deleting : actualConfirmText}
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }
);

ConfirmationDialog.displayName = "ConfirmationDialog";

export { ConfirmationDialog };
