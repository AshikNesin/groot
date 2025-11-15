import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { NuqsAdapter } from "nuqs/adapters/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { Todos } from "@/pages/Todos";
import { Login } from "@/pages/Login";
import { Toaster } from "@/components/ui/toaster";

function App() {
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
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </NuqsAdapter>
    </BrowserRouter>
  );
}

export default App;
