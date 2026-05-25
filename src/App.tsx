import { AuthProvider } from "./context/AuthProvider";
import { ToastProvider } from "./context/ToastContext";
import { RouterProvider } from "react-router-dom";
import router from "./routers/AppRouter";

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <div>
          <RouterProvider router={router} />
        </div>
      </AuthProvider>
    </ToastProvider>
  );
}
