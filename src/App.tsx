import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Shops from "./pages/Shops";
import ShopDetail from "./pages/ShopDetail";
import MyShop from "./pages/MyShop";
import AssignedShops from "./pages/AssignedShops";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ProductDetail from "./pages/ProductDetail";
import ServiceDetail from "./pages/ServiceDetail";
import ProductsServices from "./pages/ProductsServices";
import Help from "./pages/Help";
import HelpArticle from "./pages/HelpArticle";
import Vendors from "./pages/Vendors";
import PublicShop from "./pages/PublicShop";
import ClientProfile from "./pages/ClientProfile";
import Messages from "./pages/Messages";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { DashboardLayout } from "./components/layout/DashboardLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/product/:productId" element={<ProductDetail />} />
          <Route path="/service/:serviceId" element={<ServiceDetail />} />
          <Route path="/produits-services" element={<ProductsServices />} />
          <Route path="/aide" element={<Help />} />
          <Route path="/aide/article/:slug" element={<HelpArticle />} />
          <Route path="/vendeurs" element={<Vendors />} />
          <Route path="/boutique/:shopId" element={<PublicShop />} />
          <Route path="/mon-profil" element={<ClientProfile />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="shops" element={<Shops />} />
            <Route path="shops/:shopId" element={<ShopDetail />} />
            <Route path="my-shop" element={<MyShop />} />
            <Route path="my-shops" element={<AssignedShops />} />
            <Route path="settings" element={<Settings />} />
            <Route path="messages" element={<Messages />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
