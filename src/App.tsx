import { AuthProvider } from "./context/AuthProvider";
import { RouterProvider } from "react-router-dom";
import router from "./routers/AppRouter";

export default function App() {
  return (
    <AuthProvider>
        <div className="relative min-h-screen w-full">
          <RouterProvider router={router} />
        </div>
    </AuthProvider>
  );
}
