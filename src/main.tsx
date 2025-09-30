import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import router from "./routers/AppRouter";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
        <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
);
