import { NavLink, Outlet, useParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BarChart3, Briefcase, ClipboardList, Compass, Database, GitCompare, History, LayoutDashboard, Network, RotateCcw, Users } from "lucide-react";
import { AssessmentProvider, useAssessment } from "@/context/AssessmentContext";
import { DemoBadge, Pill } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ROLE_LABEL, STAGES } from "@/lib/models";
import { db } from "@/lib/db";
import { seedDemo } from "@/domain/demoSeed";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "", label: "Overview", icon: LayoutDashboard, internal: false },
  { to: "discovery", label: "Discovery", icon: Compass, internal: false },
  { to: "registers", label: "Inventories & evidence", icon: Database, internal: false },
  { to: "mapping", label: "Mapping studio", icon: Network, internal: true },
  { to: "findings", label: "Delta & gap analysis", icon: GitCompare, internal: false },
  { to: "analysis", label: "Spider & readiness", icon: BarChart3, internal: false },
  { to: "strategy", label: "Migration options", icon: ClipboardList, internal: true },
  { to: "proposal", label: "Proposal workbench", icon: Briefcase, internal: true },
  { to: "history", label: "History & exports", icon: History, internal: false },
  { to: "team", label: "Team & access", icon: Users, internal: false },
];

function Inner() {
  const { assessment, project, customer, me } = useAssessment();
  const { user } = useAuth();
  const qc = useQueryClient();
  const reset = async () => {
    const { error } = await db.rpc("reset_demo_project", { p_project: project.id });
    if (error) return toast.error(error.message);
    await seedDemo(assessment.id, project.id, user!.id);
    qc.invalidateQueries();
    toast.success("Demo data reset");
  };
  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      <aside className="no-print hidden md:flex w-60 shrink-0 flex-col border-r bg-sidebar p-3 gap-1">
        <div className="px-2 py-3">
          <Link to={`/customers/${customer.id}`} className="text-xs text-muted-foreground hover:underline">{customer.name}</Link>
          <div className="font-display font-bold leading-snug mt-0.5">{assessment.name}</div>
          <div className="flex flex-wrap gap-1 mt-2">
            <Pill tone="teal">{STAGES.find((s) => s.value === assessment.stage)?.label}</Pill>
            {project.is_demo && <DemoBadge />}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">{me.role ? ROLE_LABEL[me.role] : "No role"}{me.canViewCommercials ? " · commercials" : ""}</div>
        </div>
        <nav aria-label="Assessment" className="flex flex-col gap-0.5">
          {NAV.filter((n) => me.isInternal || !n.internal).map((n) => (
            <NavLink key={n.to} end={n.to === ""} to={n.to} className={({ isActive }) => cn("flex items-center gap-2 rounded-md px-2.5 py-2 text-sm", isActive ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60")}>
              <n.icon className="h-4 w-4" aria-hidden />{n.label}
            </NavLink>
          ))}
        </nav>
        {project.is_demo && me.isLead && (
          <div className="mt-auto p-2">
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="outline" size="sm" className="w-full"><RotateCcw className="h-4 w-4 mr-1" />Reset demo</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Reset demo data?</AlertDialogTitle><AlertDialogDescription>Only the synthetic Northstar demo project is affected. Real projects cannot be modified by this action.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={reset}>Reset demo</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </aside>
      <div className="flex-1 min-w-0">
        <div className="md:hidden no-print border-b overflow-x-auto">
          <nav aria-label="Assessment" className="flex gap-1 p-2">
            {NAV.filter((n) => me.isInternal || !n.internal).map((n) => (
              <NavLink key={n.to} end={n.to === ""} to={n.to} className={({ isActive }) => cn("whitespace-nowrap rounded-md px-3 py-1.5 text-sm", isActive ? "bg-secondary font-semibold" : "text-muted-foreground")}>{n.label}</NavLink>
            ))}
          </nav>
        </div>
        {project.is_demo && <div className="bg-demo-soft text-demo text-xs font-semibold px-6 py-1.5 no-print">DEMO — fictional Northstar Equipment project with synthetic data. No real customer facts or commercial rates.</div>}
        <div className="p-4 md:p-6 lg:p-8 max-w-[1500px]"><Outlet /></div>
      </div>
    </div>
  );
}

export default function AssessmentLayout() {
  const { assessmentId } = useParams();
  return <AssessmentProvider assessmentId={assessmentId!}><Inner /></AssessmentProvider>;
}
