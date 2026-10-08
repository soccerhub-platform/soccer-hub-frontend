import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../../shared/ProtectedRoute";
const CoachLayout = React.lazy(() => import("./CoachLayout"));
const CoachTodayPage = React.lazy(() => import("./pages/CoachTodayPage"));
const CoachSessionDetailsPage = React.lazy(() => import("./pages/CoachSessionDetailsPage"));
const CoachSchedulePage = React.lazy(() => import("./pages/CoachSchedulePage"));
const CoachHistoryPage = React.lazy(() => import("./pages/CoachHistoryPage"));
const CoachProfilePage = React.lazy(() => import("./pages/CoachProfilePage"));

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
          <Route path="profile" element={<CoachProfilePage />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default CoachRoutes;
