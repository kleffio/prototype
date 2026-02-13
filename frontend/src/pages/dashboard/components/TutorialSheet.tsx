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
  Server
} from "lucide-react";

interface TutorialSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TutorialSheet({ open, onOpenChange }: TutorialSheetProps) {
  return (
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
            <div className="overflow-hidden rounded-lg border border-white/10 bg-neutral-900/50">
              <img 
                src="/assets/tutorial/dashboard-overview.png" 
                alt="Dashboard overview statistics cards" 
                className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity"
              />
            </div>
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
            <div className="overflow-hidden rounded-lg border border-white/10 bg-neutral-900/50">
              <img 
                src="/assets/tutorial/project-resources.png" 
                alt="Project resource usage table"
                className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity"
              />
            </div>
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
            <div className="overflow-hidden rounded-lg border border-white/10 bg-neutral-900/50">
              <img 
                src="/assets/tutorial/create-project.png" 
                alt="Create project modal"
                className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity"
              />
            </div>
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
            <div className="overflow-hidden rounded-lg border border-white/10 bg-neutral-900/50">
              <img 
                src="/assets/tutorial/container-management.png" 
                alt="Container management view"
                className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity"
              />
            </div>
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
  );
}
