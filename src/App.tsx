import { AuthProvider } from "./context/AuthProvider";
import { RouterProvider } from "react-router-dom";
import { App as AntApp, ConfigProvider } from "antd";
import router from "./routers/AppRouter";

export default function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 8,
        },
      }}
    >
      <AntApp message={{ top: 72, duration: 3, maxCount: 3 }} notification={{ placement: "topRight" }}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}
