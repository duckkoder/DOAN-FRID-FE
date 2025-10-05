import React from "react";
import { Result, Button } from "antd";
import { useNavigate } from "react-router-dom";

const IsNotAllowPAge: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "#f6f9fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Result
        status="403"
        title="Bạn không có quyền truy cập trang này"
        subTitle="Vui lòng liên hệ quản trị viên nếu cần hỗ trợ."
        extra={
          <Button type="primary" onClick={() => navigate("/")}>
            Về trang chủ
          </Button>
        }
      />
    </div>
  );
};

export default IsNotAllowPAge;