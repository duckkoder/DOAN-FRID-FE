// AppLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";

const AppLayout: React.FC = () => {
  return (
    <div className="w-full h-screen max-w-md flex flex-col bg-gradient-to-b from-[#f6edda] to-[#ffffff] rounded-xl mx-auto overflow-auto scrollbar-hide">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
