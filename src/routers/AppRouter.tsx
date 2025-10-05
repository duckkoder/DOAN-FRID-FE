import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";

import AppLayout from "../layouts/AppLayout";
import ProtectedRoute from "./ProtectedRoute";

import AuthPage from "../pages/AuthPage/Authpage";
import HomePage from "../pages/HomePage/HomePage";
import AdminTeacherPage from "../pages/Admin/AdminTeacherPage";
import AdminStudentPage from "../pages/Admin/AdminStudentPage";
import AdminModalAIPage from "../pages/Admin/AdminModalAIPage";

import TeacherClassPage from "../pages/Teacher/TeacherClassPage";
import TeacherAttendancePage from "../pages/Teacher/TeacherAttendancePage";
import TeacherReportPage from "../pages/Teacher/TeacherReportPage";

import StudentClassPage from "../pages/Student/StudentClassPage";
import StudentAttendancePage from "../pages/Student/StudentAttendancePage";
import StudentReportPage from "../pages/Student/StudentReportPage";
import AdminHomePage from "../pages/Admin/AdminHomePage";
import TeacherHomePage from "../pages/Teacher/TeacherHomePage";
import StudentHomePage from "../pages/Student/StudentHomePage";
import RoleLayout from "../layouts/RoleLayout";


const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<HomePage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Route cho Admin */}
          <Route element={<RoleLayout />}>
            <Route path="/admin">
              <Route index element={<AdminHomePage />} />
              <Route path="teachers" element={<AdminTeacherPage />} />
              <Route path="students" element={<AdminStudentPage />} />
              <Route path="modalai" element={<AdminModalAIPage />} />
            </Route>

            {/* Route cho Giáo viên */}

            <Route path="/teacher">
              <Route index element={<TeacherHomePage />} />
              <Route path="classes" element={<TeacherClassPage />} />
              <Route path="attendance" element={<TeacherAttendancePage />} />
              <Route path="reports" element={<TeacherReportPage />} />
            </Route>

            {/* Route cho Học sinh */}
            <Route path="/student">
              <Route index element={<StudentHomePage />} />
              <Route path="classes" element={<StudentClassPage />} />
              <Route path="attendance" element={<StudentAttendancePage />} />
              <Route path="reports" element={<StudentReportPage />} />
            </Route>
          </Route>
        </Route>
      </Route>
{/* <Route path="*" element={<NotFound />} /> */}
    </>,
  ),
);

export default router;
