import React from "react";
import { useAuth } from "../hooks/useAuth";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import IsNotAllowPAge from "../pages/AuthPage/IsNotAllowPAge";

const roleRoutes: Record<string, string[]> = {
  admin: ["/admin", "/admin/teachers", "/admin/students", "/admin/modalai"],
  teacher: ["/teacher", "/teacher/classes", "/teacher/attendance", "/teacher/reports"],
  student: ["/student", "/student/classes", "/student/attendance", "/student/reports"],
};

const ProtectedRoute: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/auth" />;
  }

  // Kiểm tra quyền truy cập route theo role
  const allowedRoutes = roleRoutes[user.role as string] || [];
  const isAllowed = allowedRoutes.some((route) => location.pathname.startsWith(route));
  if (!isAllowed) {
    return (
      <IsNotAllowPAge />
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
