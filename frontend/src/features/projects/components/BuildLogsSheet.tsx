import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@shared/ui/Sheet";
import type { Container } from "@features/projects/types/Container";
import { BuildLogsViewer } from "./BuildLogsViewer";

interface BuildLogsSheetProps {
  container: Container | null;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BuildLogsSheet({ container, projectId, open, onOpenChange }: BuildLogsSheetProps) {
  if (!container) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-white/10 bg-neutral-950/95 backdrop-blur-xl sm:max-w-2xl"
      >
        <SheetHeader className="mb-6">
          <SheetTitle className="text-neutral-50">{container.name}</SheetTitle>
        </SheetHeader>

        <BuildLogsViewer projectId={projectId} containerId={container.containerId} />
      </SheetContent>
    </Sheet>
  );
}
