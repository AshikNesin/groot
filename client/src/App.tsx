import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { NuqsAdapter } from "nuqs/adapters/react-router";
import { useAuthStore } from "@/store/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { Todos } from "@/pages/Todos";
import { Storage } from "@/pages/Storage";
import { Jobs } from "@/pages/Jobs";
import { JobDetail } from "@/pages/JobDetail";
import { Settings } from "@/pages/Settings";
import { Login } from "@/pages/Login";
import { Toaster } from "@/components/ui/toaster";

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <NuqsAdapter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="todos" element={<Todos />} />
            <Route path="storage" element={<Storage />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="jobs/:queueName/:jobId" element={<JobDetail />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </NuqsAdapter>
    </BrowserRouter>
  );
}

export default App;
