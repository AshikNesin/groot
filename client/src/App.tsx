import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { NuqsAdapter } from "nuqs/adapters/react-router";
import { useAuthStore } from "@/core/store/auth";
import { ProtectedRoute } from "@/core/components/ProtectedRoute";
import { Layout } from "@/core/components/Layout";
import { Dashboard } from "@/app/ai/pages/Dashboard";
import { Todos } from "@/app/todo/pages/Todos";
import { Storage } from "@/app/storage/pages/Storage";
import { Jobs } from "@/app/jobs/pages/Jobs";
import { JobDetail } from "@/app/jobs/pages/JobDetail";
import { Settings } from "@/app/settings/pages/Settings";
import { Login } from "@/app/auth/pages/Login";
import { Toaster } from "@/ui/toaster";

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
