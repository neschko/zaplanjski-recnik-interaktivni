import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "./components/Layout";
import { AuthProvider } from "./hooks/useAuth";
import Index from "./pages/Index";
import Recnik from "./pages/Recnik";
import RecnikDetalj from "./pages/RecnikDetalj";
import RecnikForma from "./pages/RecnikForma";
import Analiza from "./pages/Analiza";
import AnalizaDetalj from "./pages/AnalizaDetalj";
import Komentari from "./pages/Komentari";
import Upravljanje from "./pages/Upravljanje";
import UpravljanjeOcr from "./pages/UpravljanjeOcr";
import Uputstvo from "./pages/Uputstvo";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/recnik" element={<Recnik />} />
              <Route path="/recnik/nova" element={<RecnikForma />} />
              <Route path="/recnik/:id" element={<RecnikDetalj />} />
              <Route path="/recnik/:id/uredi" element={<RecnikForma />} />
              <Route path="/analiza" element={<Analiza />} />
              <Route path="/analiza/:id" element={<AnalizaDetalj />} />
              <Route path="/komentari" element={<Komentari />} />
              <Route path="/upravljanje" element={<Upravljanje />} />
              <Route path="/upravljanje/ocr-pregled" element={<UpravljanjeOcr />} />
              <Route path="/uputstvo" element={<Uputstvo />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
