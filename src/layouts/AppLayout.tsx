// AppLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import Footer from "../components/Footer";

const AppLayout: React.FC = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#f6f9fc",
      }}
    >
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default AppLayout;
