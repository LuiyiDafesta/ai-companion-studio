import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import AgentsPage from "./pages/agents/AgentsPage";
import CreateAgentPage from "./pages/agents/CreateAgentPage";
import DocumentsPage from "./pages/documents/DocumentsPage";
import ConversationsPage from "./pages/conversations/ConversationsPage";
import AnalyticsPage from "./pages/analytics/AnalyticsPage";
import SettingsPage from "./pages/settings/SettingsPage";
import BillingPage from "./pages/billing/BillingPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminDangerZone from "./pages/admin/AdminDangerZone";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/agents/new" element={<CreateAgentPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/conversations" element={<ConversationsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/danger" element={<AdminDangerZone />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
