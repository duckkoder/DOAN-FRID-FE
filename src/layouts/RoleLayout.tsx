import React, { useContext, useState, useEffect } from "react";
import { Outlet, Navigate, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

import Header from "../components/Header";
import LeftBar from "../components/LeftBar";
import { message } from "antd";
import { getStoredTenantSlug, tenantPath } from "@/utils/tenantRouting";

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
        { key: "students", label: "Sinh viên", path: "/admin/students" },
        { key: "departments", label: "Khoa & Chuyên ngành", path: "/admin/departments" },
        { key: "rooms", label: "Phòng học", path: "/admin/rooms" },
        { key: "settings", label: "Cấu hình tích hợp", path: "/admin/settings" },
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
      label: "Thống kê",
      items: [
        { key: "dashboard", label: "Trang chủ", path: "/teacher" },
      ]
    },
    {
      label: "Quản lý",
      items: [
        { key: "courses", label: "Học phần", path: "/teacher/courses" },
        { key: "class", label: "Lớp học", path: "/teacher/classes" },
        { key: "leave", label: "Đơn nghỉ phép", path: "/teacher/leave-requests" }
      ]
    },
    {
      label: "Cá nhân",
      items: [
        { key: "profile", label: "Hồ sơ", path: "/teacher/profile" }
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
      label: "Thống kê",
      items: [
        { key: "dashboard", label: "Trang chủ", path: "/student" },
        { key: "report", label: "Đơn nghỉ phép", path: "/student/reports" }
      ]
    },
    {
      label: "Quản lý",
      items: [
        { key: "registerFace", label: "Đăng ký khuôn mặt", path: "/student/register-face" }
      ]
    },
    {
      label: "Cá nhân",
      items: [
        { key: "profile", label: "Hồ sơ", path: "/student/profile" }
      ]
    },
    {
      label: "Hành động",
      items: [
        { key: "logout", label: "Đăng xuất", path: "/auth", action: "logout" }
      ]
    }
  ]
};

const RoleLayout: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug?: string }>();
  const user = auth?.user;
  const activeTenantSlug = tenantSlug || getStoredTenantSlug();
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

  if (!user) return <Navigate to={activeTenantSlug ? `/${activeTenantSlug}/login` : "/auth"} />;

  // Handler cho logout
  const handleLogout = async () => {
    try {
      await auth?.logout();
      message.success("Đăng xuất thành công!");
      
      // Redirect to login
      navigate(activeTenantSlug ? `/${activeTenantSlug}/login` : "/auth");
      
    } catch (error) {
      console.error("Logout error:", error);
      
      // Still clear auth and redirect even if API fails
      await auth?.logout();
      message.warning("Đã đăng xuất");
      navigate("/auth");
    }
  };

  // Chọn leftBarSections và username theo role
  const leftBarSections = (leftBarConfig[user.role as "admin" | "teacher" | "student"] || []).map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      path: item.action === "logout" ? item.path : tenantPath(item.path, activeTenantSlug),
    })),
  }));
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
