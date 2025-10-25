import React, { useContext } from "react";
import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { logout as apiLogout } from "../apis/authAPIs/auth";

import Header from "../components/Header";
import LeftBar from "../components/LeftBar";
import { message } from "antd";

const leftBarConfig = {
  "admin": [ // Admin
    {
      label: "Tổng quan",
      items: [
        { key: "dashboard", label: "Trang chủ", path: "/admin" }
      ]
    },
    {
      label: "Quản lý",
      items: [
        { key: "teachers", label: "Giáo viên", path: "/admin/teachers" },
        { key: "students", label: "Học sinh", path: "/admin/students" },
        { key: "modalai", label: "ModelAI", path: "/admin/modalai" }
      ]
    },
    {
      label: "Hành động",
      items: [
        { key: "logout", label: "Đăng xuất", path: "/auth", action: "logout" }
      ]
    }
  ],
  "teacher": [ // Teacher
    {
      label: "Phân tích",
      items: [
        { key: "dashboard", label: "Trang chủ", path: "/teacher" },
      ]
    },
    {
      label: "Quản lý",
      items: [
        { key: "class", label: "Lớp học", path: "/teacher/classes" },
        { key: "leave", label: "Đơn nghỉ học", path: "/teacher/leave-requests" }
      ]
    },
    {
      label: "Hành động",
      items: [
        { key: "logout", label: "Đăng xuất", path: "/auth", action: "logout" }
      ]
    }
  ],
  "student": [ // Student
    {
        label: "Theo dõi",
      items: [
        { key: "classes", label: "Lớp học", path: "/student/classes" },
        { key: "attendance", label: "Điểm danh", path: "/student/attendance" }
      ]
    },
    {
      label: "Phân tích",
      items: [
        { key: "dashboard", label: "Trang chủ", path: "/student" },
        { key: "report", label: "Đơn nghỉ học", path: "/student/reports" }
      ]
    },
    {
      label: "Quản lý",
      items: [
        { key: "registerFace", label: "Đăng ký khuôn mặt", path: "/student/register-face" },
        { key: "logout", label: "Đăng xuất", path: "/auth", action: "logout" }
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
      const refreshToken = auth?.tokens.refreshToken;
      
      if (refreshToken) {
        await apiLogout({ refresh_token: refreshToken });
      }
      
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