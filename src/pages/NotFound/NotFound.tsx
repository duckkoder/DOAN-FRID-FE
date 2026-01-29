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
        subTitle="Sorry, the page you are looking for does not exist."
        extra={
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
            <Button type="primary" icon={<HomeOutlined />} onClick={() => navigate("/")}>
              Go to Home
            </Button>
          </div>
        }
      />
    </div>
  );
};

export default NotFound;