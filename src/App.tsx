import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import AgentsPage from "./pages/agents/AgentsPage";
import CreateAgentPage from "./pages/agents/CreateAgentPage";
import EditAgentPage from "./pages/agents/EditAgentPage";

import ConversationsPage from "./pages/conversations/ConversationsPage";
import AnalyticsPage from "./pages/analytics/AnalyticsPage";
import SettingsPage from "./pages/settings/SettingsPage";
import BillingPage from "./pages/billing/BillingPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminAgentsPage from "./pages/admin/AdminAgentsPage";
import AdminMetricsPage from "./pages/admin/AdminMetricsPage";
import AdminIntegrationsPage from "./pages/admin/AdminIntegrationsPage";
import AdminAIConfigPage from "./pages/admin/AdminAIConfigPage";
import AdminSecurityPage from "./pages/admin/AdminSecurityPage";
import AdminDangerZone from "./pages/admin/AdminDangerZone";
import AdminBillingPage from "./pages/admin/AdminBillingPage";
import PlaygroundPage from "./pages/playground/PlaygroundPage";
import WidgetPage from "./pages/widget/WidgetPage";
import EmbedPage from "./pages/agents/EmbedPage";

const queryClient = new QueryClient();

// PayPal configuration
const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || "";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PayPalScriptProvider options={{
      clientId: paypalClientId,
      currency: "USD",
      intent: "capture"
    }}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter basename={import.meta.env.PROD ? "/agentes" : ""}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/agents" element={<AgentsPage />} />
                  <Route path="/agents/new" element={<CreateAgentPage />} />
                  <Route path="/agents/:id" element={<EditAgentPage />} />
                  <Route path="/agents/:id/embed" element={<EmbedPage />} />

                  <Route path="/conversations" element={<ConversationsPage />} />
                  <Route path="/playground" element={<PlaygroundPage />} />
                  <Route path="/widget/:agentId" element={<WidgetPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/billing" element={<BillingPage />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/agents" element={<AdminAgentsPage />} />
                  <Route path="/admin/metrics" element={<AdminMetricsPage />} />
                  <Route path="/admin/billing" element={<AdminBillingPage />} />
                  <Route path="/admin/integrations" element={<AdminIntegrationsPage />} />
                  <Route path="/admin/ai-config" element={<AdminAIConfigPage />} />
                  <Route path="/admin/security" element={<AdminSecurityPage />} />
                  <Route path="/admin/danger" element={<AdminDangerZone />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </PayPalScriptProvider>
  </QueryClientProvider>
);

export default App;
