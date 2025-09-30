// UserLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import Footer from "../components/Footer";

const UserLayout: React.FC = () => {
  return (
    <div className="w-full  min-h-screen max-w-md flex flex-col bg-gray-200 rounded-xl shadow-lg overflow-hidden">
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default UserLayout;
