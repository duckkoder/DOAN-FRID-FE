import React from "react";
import { useAuth } from "../hooks/useAuth";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import IsNotAllowPAge from "../pages/AuthPage/IsNotAllowPAge";

const roleRoutes: Record<string, string[]> = {
  admin: ["/admin", "/admin/teachers", "/admin/students"],
  teacher: ["/teacher", "/teacher/classes", "/teacher/class/:classId",
     "/teacher/attendance", "/teacher/reports", "/teacher/leave-requests",
     "/teacher/class/create"],
  student: ["/student", "/student/classes", "/student/attendance", "/student/reports",
    "/student/class/:classId", "/student/register-face"],
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
