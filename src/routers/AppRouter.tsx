import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";

import AppLayout from "../layouts/AppLayout";
import ProtectedRoute from "./ProtectedRoute";
import PlatformProtectedRoute from "./PlatformProtectedRoute";
import RoleLayout from "../layouts/RoleLayout";

import AuthPage from "../pages/AuthPage/Authpage";
import HomePage from "../pages/HomePage/HomePage";

import AdminTeacherPage from "../pages/Admin/AdminTeacherPage";
import AdminStudentPage from "../pages/Admin/AdminStudentPage";
import AdminDepartmentPage from "../pages/Admin/AdminDepartmentPage";
import AdminHomePage from "../pages/Admin/AdminHomePage";
import AdminRoomPage from "../pages/Admin/AdminRoomPage";
import AdminTenantSettingsPage from "../pages/Admin/AdminTenantSettingsPage";

import TeacherClassPage from "../pages/Teacher/TeacherClassPage";
import TeacherCoursePage from "../pages/Teacher/TeacherCoursePage";
import SessionDetailPage from "../pages/Teacher/SessionDetailPage";
import TeacherReportPage from "../pages/Teacher/TeacherReportPage";
import TeacherHomePage from "../pages/Teacher/TeacherHomePage";
import TeacherProfilePage from "../pages/Teacher/TeacherProfilePage";
import TeacherLeaveRequestPage from "../pages/Teacher/TeacherLeaveRequestPage";
import ClassDetailPage from "../pages/Teacher/ClassDetailPage";

import StudentClassDetailPage from "../pages/Student/StudentClassDetailPage";
import StudentClassPage from "../pages/Student/StudentClassPage";
import StudentAttendancePage from "../pages/Student/StudentAttendancePage";
import StudentAttendanceListPage from "../pages/Student/StudentAttendanceListPage";
import StudentReportPage from "../pages/Student/StudentReportPage";
import StudentHomePage from "../pages/Student/StudentHomePage";
import StudentProfilePage from "../pages/Student/StudentProfilePage";
import FaceRegisterPage from "../pages/Student/FaceRegisterPage";

import ClassCreatePage from "../pages/Class/ClassCreatePage";
import LearningWorkspacePage from "../pages/LearningWorkspacePage/LearningWorkspacePage";
import NotFound from "../pages/NotFound/NotFound";
import PlatformLoginPage from "../pages/Platform/PlatformLoginPage";
import PlatformTenantsPage from "../pages/Platform/PlatformTenantsPage";

const roleRoutes = (
  <>
    <Route path="teacher/classes/:classId/learning/:documentId" element={<LearningWorkspacePage />} />
    <Route path="student/classes/:classId/learning/:documentId" element={<LearningWorkspacePage />} />

    <Route element={<AppLayout />}>
      <Route element={<RoleLayout />}>
        <Route path="admin">
          <Route index element={<AdminHomePage />} />
          <Route path="teachers" element={<AdminTeacherPage />} />
          <Route path="students" element={<AdminStudentPage />} />
          <Route path="departments" element={<AdminDepartmentPage />} />
          <Route path="rooms" element={<AdminRoomPage />} />
          <Route path="settings" element={<AdminTenantSettingsPage />} />
        </Route>

        <Route path="teacher">
          <Route index element={<TeacherHomePage />} />
          <Route path="courses" element={<TeacherCoursePage />} />
          <Route path="classes" element={<TeacherClassPage />} />
          <Route path="class/:classId" element={<ClassDetailPage />} />
          <Route path="attendance/:sessionId" element={<SessionDetailPage />} />
          <Route path="reports" element={<TeacherReportPage />} />
          <Route path="leave-requests" element={<TeacherLeaveRequestPage />} />
          <Route path="classes/create" element={<ClassCreatePage />} />
          <Route path="profile" element={<TeacherProfilePage />} />
        </Route>

        <Route path="student">
          <Route index element={<StudentHomePage />} />
          <Route path="classes" element={<StudentClassPage />} />
          <Route path="classes/:classId" element={<StudentClassDetailPage />} />
          <Route path="classes/:classId/attendance" element={<StudentAttendanceListPage />} />
          <Route path="attendance" element={<StudentAttendancePage />} />
          <Route path="reports" element={<StudentReportPage />} />
          <Route path="register-face" element={<FaceRegisterPage />} />
          <Route path="profile" element={<StudentProfilePage />} />
        </Route>
      </Route>
    </Route>
  </>
);

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/:tenantSlug" element={<AuthPage />} />
      <Route path="/:tenantSlug/login" element={<AuthPage />} />
      <Route path="/platform/login" element={<PlatformLoginPage />} />
      <Route element={<PlatformProtectedRoute />}>
        <Route path="/platform/tenants" element={<PlatformTenantsPage />} />
        <Route path="/platform" element={<PlatformTenantsPage />} />
      </Route>
      <Route path="/" element={<HomePage />} />

      <Route element={<ProtectedRoute />}>{roleRoutes}</Route>
      <Route path="/:tenantSlug" element={<ProtectedRoute />}>{roleRoutes}</Route>

      <Route path="*" element={<NotFound />} />
    </>,
  ),
);

export default router;
