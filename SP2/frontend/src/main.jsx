import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

import LandingPage        from "./pages/LandingPage";
import LoginPage          from "./pages/LoginPage";
import RegisterPage       from "./pages/RegisterPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import CampaignDetailPage from "./pages/CampaignDetailPage";
import SupervisorPage     from "./pages/SupervisorPage";
import PilgrimPage        from "./pages/PilgrimPage";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"                    element={<LandingPage />} />
        <Route path="/login"               element={<LoginPage />} />
        <Route path="/register"            element={<RegisterPage />} />
        <Route path="/admin"               element={<AdminDashboardPage />} />
        <Route path="/admin/campaigns/:id" element={<CampaignDetailPage />} />
        <Route path="/supervisor/:id"      element={<SupervisorPage />} />
        <Route path="/pilgrim/:id"         element={<PilgrimPage />} />
        <Route path="*"                    element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
