import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { clearPlatformToken, isValidPlatformToken } from "@/apis/platformAPIs/platform";

const PlatformProtectedRoute: React.FC = () => {
  const location = useLocation();

  if (!isValidPlatformToken()) {
    clearPlatformToken();
    return <Navigate to="/platform/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

export default PlatformProtectedRoute;
