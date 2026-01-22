import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { notificationService } from "./services/notificationService";
import { NotificationProvider } from "./contexts/NotificationContext";
import { NotificationBridge } from "@/components/NotificationBridge";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Initialize notifications SDK on app load (no permission prompt here)
    void notificationService.init();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <NotificationBridge />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/app" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
};

export default App;