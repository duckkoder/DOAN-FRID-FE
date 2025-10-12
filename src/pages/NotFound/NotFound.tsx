import React from "react";
import { Result, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { HomeOutlined } from "@ant-design/icons";

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0f2f5",
      }}
    >
      <Result
        status="404"
        title="404"
        subTitle="Xin lỗi, trang bạn tìm kiếm không tồn tại."
        extra={
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Button onClick={() => navigate(-1)}>Quay lại</Button>
            <Button type="primary" icon={<HomeOutlined />} onClick={() => navigate("/")}>
              Về trang chủ
            </Button>
          </div>
        }
      />
    </div>
  );
};

export default NotFound;