import { AuthProvider } from "./context/AuthProvider";
import { ToastProvider } from "./context/ToastContext";
import { RouterProvider } from "react-router-dom";
import router from "./routers/AppRouter";

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        {/* <div style={{ minHeight: "100vh", width: "100%", position: "relative" }}> */}
        <div >
          <RouterProvider router={router} />
        </div>
      </AuthProvider>
    </ToastProvider>
  );
}
