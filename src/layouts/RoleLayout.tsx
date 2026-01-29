import React, { useContext, useState, useEffect } from "react";
import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { logout as apiLogout } from "../apis/authAPIs/auth";

import Header from "../components/Header";
import LeftBar from "../components/LeftBar";
import { message } from "antd";

const leftBarConfig = {
  "admin": [ // Admin
    {
      label: "Overview",
      items: [
        { key: "dashboard", label: "Home", path: "/admin" }
      ]
    },
    {
      label: "Management",
      items: [
        { key: "teachers", label: "Teachers", path: "/admin/teachers" },
        { key: "students", label: "Students", path: "/admin/students" },
      ]
    },
    {
      label: "Actions",
      items: [
        { key: "logout", label: "Sign Out", path: "/auth", action: "logout" }
      ]
    }
  ],
  "teacher": [ // Teacher
    {
      label: "Analytics",
      items: [
        { key: "dashboard", label: "Home", path: "/teacher" },
      ]
    },
    {
      label: "Management",
      items: [
        { key: "class", label: "Classes", path: "/teacher/classes" },
        { key: "leave", label: "Leave Requests", path: "/teacher/leave-requests" }
      ]
    },
    {
      label: "Personal",
      items: [
        { key: "profile", label: "Profile", path: "/teacher/profile" }
      ]
    },
    {
      label: "Actions",
      items: [
        { key: "logout", label: "Sign Out", path: "/auth", action: "logout" }
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
      label: "Analytics",
      items: [
        { key: "dashboard", label: "Home", path: "/student" },
        { key: "report", label: "Leave Requests", path: "/student/reports" }
      ]
    },
    {
      label: "Management",
      items: [
        { key: "registerFace", label: "Face Registration", path: "/student/register-face" }
      ]
    },
    {
      label: "Personal",
      items: [
        { key: "profile", label: "Profile", path: "/student/profile" }
      ]
    },
    {
      label: "Actions",
      items: [
        { key: "logout", label: "Sign Out", path: "/auth", action: "logout" }
      ]
    }
  ]
};

const RoleLayout: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const user = auth?.user;
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // Auto close drawer when switching to desktop
      if (!mobile) {
        setDrawerVisible(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!user) return <Navigate to="/auth" />;

  // Handler cho logout
  const handleLogout = async () => {
    try {
      const refreshToken = auth?.tokens.refreshToken;
      
      if (refreshToken) {
        await apiLogout({ refresh_token: refreshToken });
      }
      
      auth?.logout();
      
      message.success("Signed out successfully!");
      
      // Redirect to login
      navigate("/auth");
      
    } catch (error) {
      console.error("Logout error:", error);
      
      // Still clear auth and redirect even if API fails
      auth?.logout();
      message.warning("Signed out");
      navigate("/auth");
    }
  };

  // Chọn leftBarSections và username theo role
  const leftBarSections = leftBarConfig[user.role as "admin" | "teacher" | "student"] || [];
  const username = user.full_name;

  return (
    <div style={{ minHeight: "100vh", background: "#f6f9fc", display: "flex", flexDirection: "column" }}>
      <Header 
        username={username} 
        role={user.role}
        showMenuButton={isMobile}
        onMenuClick={() => setDrawerVisible(true)}
      />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {!isMobile && (
          <LeftBar 
            sections={leftBarSections} 
            onLogout={handleLogout}
            isMobile={false}
          />
        )}
        {isMobile && (
          <LeftBar 
            sections={leftBarSections} 
            onLogout={handleLogout}
            isMobile={true}
            visible={drawerVisible}
            onClose={() => setDrawerVisible(false)}
          />
        )}
        <div style={{ flex: 1, overflow: "auto" }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default RoleLayout;