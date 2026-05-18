import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../../shared/ProtectedRoute";
import CoachLayout from "./CoachLayout";
import CoachTodayPage from "./pages/CoachTodayPage";
import CoachSessionDetailsPage from "./pages/CoachSessionDetailsPage";
import CoachSchedulePage from "./pages/CoachSchedulePage";
import CoachHistoryPage from "./pages/CoachHistoryPage";

const CoachRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<ProtectedRoute roles={["COACH"]} redirectTo="/login" />}>
        <Route element={<CoachLayout />}>
          <Route index element={<Navigate to="today" replace />} />
          <Route path="today" element={<CoachTodayPage />} />
          <Route path="sessions/:id" element={<CoachSessionDetailsPage />} />
          <Route path="schedule" element={<CoachSchedulePage />} />
          <Route path="history" element={<CoachHistoryPage />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default CoachRoutes;
