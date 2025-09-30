import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";

import AppLayout from "../layouts/AppLayout";
import ProtectedRoute from "./ProtectedRoute";

import AuthPage from "../pages/AuthPage/Authpage";


const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      // Public routes
      <Route path="/auth" element={<AuthPage />} />
      // Protected routes
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Home */}
        </Route>
      </Route>
{/* 
      <Route path="*" element={<NotFound />} /> */}
    </>,
  ),
);

export default router;
