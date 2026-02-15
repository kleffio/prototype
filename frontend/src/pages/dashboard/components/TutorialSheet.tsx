import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@shared/ui/Sheet";
import { LayoutDashboard, Activity, Plus, RefreshCw, Server, X, ZoomIn } from "lucide-react";
import { useState } from "react";

interface TutorialSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TutorialImage = ({
  src,
  alt,
  onClick
}: {
  src: string;
  alt: string;
  onClick: (src: string) => void;
}) => (
  <div
    className="group relative cursor-zoom-in overflow-hidden rounded-lg border border-white/10 bg-neutral-900/50"
    onClick={() => onClick(src)}
  >
    <img
      src={src}
      alt={alt}
      className="h-auto w-full object-cover opacity-90 transition-all duration-300 group-hover:scale-[1.02] group-hover:opacity-100"
    />
    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
      <div className="rounded-full border border-white/20 bg-black/50 p-2">
        <ZoomIn className="h-5 w-5 text-white" />
      </div>
    </div>
  </div>
);

export function TutorialSheet({ open, onOpenChange }: TutorialSheetProps) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const handleImageClick = (src: string) => {
    setZoomedImage(src);
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full border-l border-white/10 bg-[#0A0A0A] text-neutral-200 sm:w-[540px]"
        >
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl text-white">Dashboard Tutorial</SheetTitle>
            <SheetDescription className="text-neutral-400">
              Welcome to your Project Dashboard. Here is a quick guide to help you get started with
              monitoring and managing your applications.
            </SheetDescription>
          </SheetHeader>

          <div className="flex h-[calc(100vh-140px)] flex-col gap-8 overflow-y-auto pr-4 pb-8">
            <section className="space-y-3">
              <div className="text-primary flex items-center gap-2">
                <div className="bg-primary/10 border-primary/20 rounded-lg border p-2">
                  <LayoutDashboard size={20} />
                </div>
                <h3 className="text-lg font-semibold">Project Overview</h3>
              </div>
              <p className="text-sm leading-relaxed text-neutral-300">
                The main dashboard provides a high-level view of all your deployed projects. Top
                cards show aggregate statistics like total active projects, CPU cores reserved, and
                memory allocated across your entire fleet.
              </p>
              <TutorialImage
                src="/assets/tutorial/dashboard-overview.png"
                alt="Dashboard overview statistics cards"
                onClick={handleImageClick}
              />
            </section>

            <section className="space-y-3">
              <div className="text-primary flex items-center gap-2">
                <div className="bg-primary/10 border-primary/20 rounded-lg border p-2">
                  <Activity size={20} />
                </div>
                <h3 className="text-lg font-semibold">Resource Monitoring</h3>
              </div>
              <p className="text-sm leading-relaxed text-neutral-300">
                Real-time metrics are collected for each project.
                <br />
                <span className="font-medium text-white">CPU Cores:</span> Shows the processing
                power reserved/used.
                <br />
                <span className="font-medium text-white">Memory (GB):</span> Shows the RAM
                consumption.
              </p>
              <TutorialImage
                src="/assets/tutorial/project-resources.png"
                alt="Project resource usage table"
                onClick={handleImageClick}
              />
            </section>

            <section className="space-y-3">
              <div className="text-primary flex items-center gap-2">
                <div className="bg-primary/10 border-primary/20 rounded-lg border p-2">
                  <Plus size={20} />
                </div>
                <h3 className="text-lg font-semibold">Creating Projects</h3>
              </div>
              <p className="text-sm leading-relaxed text-neutral-300">
                Ready to deploy something new? Click the{" "}
                <span className="mx-1 inline-flex items-center rounded bg-white px-2 py-0.5 text-xs font-semibold text-black">
                  New Project
                </span>{" "}
                button in the top right. You'll be guided through selecting your stack (Node.js, Go,
                Python, etc.) and configuring basic resources.
              </p>
              <TutorialImage
                src="/assets/tutorial/create-project.png"
                alt="Create project modal"
                onClick={handleImageClick}
              />
            </section>

            <section className="space-y-3">
              <div className="text-primary flex items-center gap-2">
                <div className="bg-primary/10 border-primary/20 rounded-lg border p-2">
                  <Server size={20} />
                </div>
                <h3 className="text-lg font-semibold">Managing Containers</h3>
              </div>
              <p className="text-sm leading-relaxed text-neutral-300">
                Inside each project, you can launch and manage specific containers. Navigate to a
                project's detail page to add containers, view their logs, and monitor their
                individual performance.
              </p>
              <TutorialImage
                src="/assets/tutorial/container-management.png"
                alt="Container management view"
                onClick={handleImageClick}
              />
            </section>

            <section className="space-y-3">
              <div className="text-primary flex items-center gap-2">
                <div className="bg-primary/10 border-primary/20 rounded-lg border p-2">
                  <RefreshCw size={20} />
                </div>
                <h3 className="text-lg font-semibold">Live Updates</h3>
              </div>
              <p className="text-sm leading-relaxed text-neutral-300">
                Metrics refresh automatically every 30 seconds. You can also manually refresh data
                using the
                <span className="mx-1 inline-flex items-center gap-1 rounded border border-white/20 bg-white/5 px-2 py-0.5 text-xs">
                  <RefreshCw size={10} /> Refresh
                </span>
                button if you need the latest numbers immediately.
              </p>
            </section>
          </div>
        </SheetContent>
      </Sheet>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div
          className="animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm duration-200"
          onClick={() => {
            setZoomedImage(null);
            onOpenChange(true);
          }}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <button
              onClick={() => {
                setZoomedImage(null);
                onOpenChange(true);
              }}
              className="absolute -top-12 right-0 p-2 text-white transition-colors hover:text-neutral-300"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={zoomedImage}
              alt="Tutorial zoom"
              className="max-h-[90vh] max-w-full rounded-lg border border-white/10 object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}
