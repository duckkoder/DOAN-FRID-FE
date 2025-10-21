import React, { useContext } from "react";
import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { logout as apiLogout } from "../apis/authAPIs/auth";
import getRefreshToken from "../apis/axios";
import Header from "../components/Header";
import LeftBar from "../components/LeftBar";
import { message } from "antd";

const leftBarConfig = {
  "admin": [ // Admin
    {
      label: "Overview",
      items: [
        { key: "dashboard", label: "Dashboard", path: "/admin" }
      ]
    },
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
        { key: "logout", label: "Logout", path: "/auth", action: "logout" }
      ]
    }
  ],
  "teacher": [ // Teacher
    {
      label: "Analyse",
      items: [
        { key: "dashboard", label: "Dashboard", path: "/teacher" },
      ]
    },
    {
      label: "Manage",
      items: [
        { key: "class", label: "Class", path: "/teacher/classes" },
        { key: "report", label: "Report", path: "/teacher/reports" },
        { key: "leave", label: "Leave Request", path: "/teacher/leave-requests" }
      ]
    },
    {
      label: "Actions",
      items: [
        { key: "logout", label: "Logout", path: "/auth", action: "logout" }
      ]
    }
  ],
  "student": [ // Student
    {
      label: "Track",
      items: [
        { key: "classes", label: "Classes", path: "/student/classes" },
        { key: "attendance", label: "Attendance", path: "/student/attendance" }
      ]
    },
    {
      label: "Analyse",
      items: [
        { key: "dashboard", label: "Dashboard", path: "/student" },
        { key: "report", label: "Report", path: "/student/reports" }
      ]
    },
    {
      label: "Actions",
      items: [
        { key: "registerFace", label: "Register Face", path: "/student/register-face" },
        { key: "logout", label: "Logout", path: "/auth", action: "logout" }
      ]
    }
  ]
};

const RoleLayout: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const user = auth?.user;

  if (!user) return <Navigate to="/auth" />;

  // Handler cho logout
  const handleLogout = async () => {
    try {
      const refreshToken = getRefreshToken();
      
      if (refreshToken) {
        // Call logout API
        await apiLogout({ refresh_token: refreshToken });
      }
      
      // Clear auth context
      auth?.logout();
      
      message.success("Đăng xuất thành công!");
      
      // Redirect to login
      navigate("/auth");
      
    } catch (error) {
      console.error("Logout error:", error);
      
      // Vẫn clear auth và redirect dù API fail
      auth?.logout();
      message.warning("Đã đăng xuất");
      navigate("/auth");
    }
  };

  // Chọn leftBarSections và username theo role
  const leftBarSections = leftBarConfig[user.role as "admin" | "teacher" | "student"] || [];
  const username = user.full_name;

  return (
    <div style={{ minHeight: "100vh", background: "#f6f9fc", display: "flex", flexDirection: "column" }}>
      <Header username={username} role={user.role} />
      <div style={{ display: "flex", flex: 1 }}>
        <LeftBar 
          sections={leftBarSections} 
          onLogout={handleLogout}
        />
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default RoleLayout;