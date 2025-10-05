import React from "react";
import { useAuth } from "../hooks/useAuth";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute: React.FC = () => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/auth" />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
