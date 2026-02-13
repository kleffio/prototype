import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@shared/ui/Sheet";
import { 
  LayoutDashboard, 
  Activity, 
  Plus, 
  RefreshCw,
  Server,
  X,
  ZoomIn
} from "lucide-react";
import { useState } from "react";

interface TutorialSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TutorialSheet({ open, onOpenChange }: TutorialSheetProps) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const TutorialImage = ({ src, alt }: { src: string; alt: string }) => (
    <div 
      className="group relative overflow-hidden rounded-lg border border-white/10 bg-neutral-900/50 cursor-zoom-in"
      onClick={() => {
        setZoomedImage(src);
        onOpenChange(false);
      }}
    >
      <img 
        src={src} 
        alt={alt} 
        className="w-full h-auto object-cover opacity-90 transition-all duration-300 group-hover:opacity-100 group-hover:scale-[1.02]"
      />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[1px]">
        <div className="bg-black/50 p-2 rounded-full border border-white/20">
          <ZoomIn className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:w-[540px] border-l border-white/10 bg-[#0A0A0A] text-neutral-200">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl text-white">Dashboard Tutorial</SheetTitle>
            <SheetDescription className="text-neutral-400">
              Welcome to your Project Dashboard. Here is a quick guide to help you get started with monitoring and managing your applications.
            </SheetDescription>
          </SheetHeader>
          
          <div className="flex flex-col gap-8 overflow-y-auto h-[calc(100vh-140px)] pr-4 pb-8">
            
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <LayoutDashboard size={20} />
                </div>
                <h3 className="font-semibold text-lg">Project Overview</h3>
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed">
                The main dashboard provides a high-level view of all your deployed projects. 
                Top cards show aggregate statistics like total active projects, CPU cores reserved, and memory allocated across your entire fleet.
              </p>
              <TutorialImage 
                src="/assets/tutorial/dashboard-overview.png" 
                alt="Dashboard overview statistics cards" 
              />
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Activity size={20} />
                </div>
                <h3 className="font-semibold text-lg">Resource Monitoring</h3>
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Real-time metrics are collected for each project.
                <br/>
                <span className="font-medium text-white">CPU Cores:</span> Shows the processing power reserved/used.
                <br/>
                <span className="font-medium text-white">Memory (GB):</span> Shows the RAM consumption.
              </p>
              <TutorialImage 
                src="/assets/tutorial/project-resources.png" 
                alt="Project resource usage table"
              />
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Plus size={20} />
                </div>
                <h3 className="font-semibold text-lg">Creating Projects</h3>
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Ready to deploy something new? Click the <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white text-black font-semibold mx-1">New Project</span> button in the top right.
                You'll be guided through selecting your stack (Node.js, Go, Python, etc.) and configuring basic resources.
              </p>
              <TutorialImage 
                src="/assets/tutorial/create-project.png" 
                alt="Create project modal"
              />
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Server size={20} />
                </div>
                <h3 className="font-semibold text-lg">Managing Containers</h3>
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Inside each project, you can launch and manage specific containers.
                Navigate to a project's detail page to add containers, view their logs, and monitor their individual performance.
              </p>
              <TutorialImage 
                src="/assets/tutorial/container-management.png" 
                alt="Container management view"
              />
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <RefreshCw size={20} />
                </div>
                <h3 className="font-semibold text-lg">Live Updates</h3>
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Metrics refresh automatically every 30 seconds. You can also manually refresh data using the 
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border border-white/20 bg-white/5 mx-1"><RefreshCw size={10}/> Refresh</span> 
                button if you need the latest numbers immediately.
              </p>
            </section>

          </div>
        </SheetContent>
      </Sheet>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => {
            setZoomedImage(null);
            onOpenChange(true);
          }}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              onClick={() => {
                setZoomedImage(null);
                onOpenChange(true);
              }}
              className="absolute -top-12 right-0 p-2 text-white hover:text-neutral-300 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <img 
              src={zoomedImage} 
              alt="Tutorial zoom" 
              className="max-w-full max-h-[90vh] rounded-lg border border-white/10 shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}
    </>
  );
}
