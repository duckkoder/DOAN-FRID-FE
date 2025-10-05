import { AuthProvider } from "./context/AuthProvider";
import { RouterProvider } from "react-router-dom";
import router from "./routers/AppRouter";

export default function App() {
  return (
    <AuthProvider>
      {/* <div style={{ minHeight: "100vh", width: "100%", position: "relative" }}> */}
      <div >
        <RouterProvider router={router} />
      </div>
    </AuthProvider>
  );
}
