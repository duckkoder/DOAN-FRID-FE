import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";

import AppLayout from "../layouts/AppLayout";
import ProtectedRoute from "./ProtectedRoute";

import AuthPage from "../pages/AuthPage/Authpage";
import HomePage from "../pages/HomePage/HomePage";


const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/auth" element={<AuthPage />} />
      
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          {/* Home */}
        </Route>
      </Route>
{/* <Route path="*" element={<NotFound />} /> */}
    </>,
  ),
);

export default router;
