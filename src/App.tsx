import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AppShell from "@/components/app/AppShell";
import AuthPage from "@/pages/AuthPage";
import Portfolio from "@/pages/Portfolio";
import CustomerPage from "@/pages/CustomerPage";
import AssessmentLayout from "@/pages/assessment/AssessmentLayout";
import Overview from "@/pages/assessment/Overview";
import Discovery from "@/pages/assessment/Discovery";
import Registers from "@/pages/assessment/Registers";
import MappingStudio from "@/pages/assessment/MappingStudio";
import Findings from "@/pages/assessment/Findings";
import Analysis from "@/pages/assessment/Analysis";
import Strategy from "@/pages/assessment/Strategy";
import Proposal from "@/pages/assessment/Proposal";
import History from "@/pages/assessment/History";
import Team from "@/pages/assessment/Team";
import Admin from "@/pages/Admin";
import Glossary from "@/pages/Glossary";
import NotFound from "@/pages/NotFound";
import CustomerSurvey from "@/pages/CustomerSurvey";
import Surveys from "@/pages/assessment/Surveys";

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: 1 } } });

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="p-10 text-muted-foreground" aria-live="polite">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace state={{ from: loc.pathname }} />;
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <TooltipProvider delayDuration={200}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/survey" element={<CustomerSurvey />} />
              <Route path="/reset-password" element={<Navigate to="/auth" replace />} />
              <Route element={<Protected><AppShell /></Protected>}>
                <Route path="/" element={<Portfolio />} />
                <Route path="/customers/:customerId" element={<CustomerPage />} />
                <Route path="/a/:assessmentId" element={<AssessmentLayout />}>
                  <Route index element={<Overview />} />
                  <Route path="discovery" element={<Discovery />} />
                  <Route path="surveys" element={<Surveys />} />
                  <Route path="registers" element={<Registers />} />
                  <Route path="mapping" element={<MappingStudio />} />
                  <Route path="findings" element={<Findings />} />
                  <Route path="analysis" element={<Analysis />} />
                  <Route path="strategy" element={<Strategy />} />
                  <Route path="proposal" element={<Proposal />} />
                  <Route path="history" element={<History />} />
                  <Route path="team" element={<Team />} />
                </Route>
                <Route path="/admin" element={<Admin />} />
                <Route path="/glossary" element={<Glossary />} />
              </Route>
              <Route path="/login" element={<Navigate to="/auth" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <Toaster richColors closeButton />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
