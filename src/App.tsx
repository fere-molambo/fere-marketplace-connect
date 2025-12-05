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
import Catalogue from "./pages/Catalogue";
import Vendors from "./pages/Vendors";
import Help from "./pages/Help";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

const queryClient = new QueryClient();

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
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/vendeurs" element={<Vendors />} />
          <Route path="/aide" element={<Help />} />
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
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
