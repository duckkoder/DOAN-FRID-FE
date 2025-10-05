import React, { useContext } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import LeftBar from "../components/LeftBar";

const leftBarConfig = {
  "admin": [ // Admin
    {
      label: "Manage",
      items: [
        { key: "teachers", label: "Teacher", path: "/admin/teachers" },
        { key: "students", label: "Student", path: "/admin/students" },
        { key: "modalai", label: "ModalAI", path: "/admin/modalai" }
      ]
    },
    {
      label: "Actions",
      items: [
        { key: "logout", label: "Logout", path: "/auth" }
      ]
    }
  ],
  "teacher": [ // Teacher
    {
      label: "Track",
      items: [
        { key: "attendance", label: "Attendance", path: "/teacher/attendance" }
      ]
    },
    {
      label: "Analyse",
      items: [
        { key: "dashboard", label: "Dashboard", path: "/teacher/classes" },
        { key: "report", label: "Report", path: "/teacher/reports" }
      ]
    },
    {
      label: "Manage",
      items: [
        { key: "student", label: "Student", path: "/teacher/student" }
      ]
    },
    {
      label: "Actions",
      items: [
        { key: "logout", label: "Logout", path: "/auth" }
      ]
    }
  ],
  "student": [ // Student
    {
      label: "Track",
      items: [
        { key: "attendance", label: "Attendance", path: "/student/attendance" }
      ]
    },
    {
      label: "Analyse",
      items: [
        { key: "dashboard", label: "Dashboard", path: "/student/classes" },
        { key: "report", label: "Report", path: "/student/reports" }
      ]
    },
    {
      label: "Actions",
      items: [
        { key: "logout", label: "Logout", path: "/auth" }
      ]
    }
  ]
};

const RoleLayout: React.FC = () => {
  const { user } = useContext(AuthContext);

  if (!user) return <Navigate to="/auth" />;

  // Điều hướng về đúng trang home theo role
  if (window.location.pathname === "/") {
    if (user.role === "admin") return <Navigate to="/admin" />;
    if (user.role === "teacher") return <Navigate to="/teacher" />;
    if (user.role === "student") return <Navigate to="/student" />;
  }

  // Chọn leftBarSections và username theo role
  const leftBarSections = leftBarConfig[user.role as 1 | 2 | 3] || [];
  const username = user.name || user.username || "User";

  return (
    <div style={{ minHeight: "100vh", background: "#f6f9fc", display: "flex", flexDirection: "column" }}>
      <Header username={username} />
      <div style={{ display: "flex", flex: 1 }}>
        <LeftBar sections={leftBarSections} />
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default RoleLayout;