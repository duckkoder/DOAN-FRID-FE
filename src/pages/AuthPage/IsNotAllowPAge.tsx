import React from "react";
import { Result, Button } from "antd";
import { useNavigate } from "react-router-dom";

const IsNotAllowPAge: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "#f6f9fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Result
        status="403"
        title="You do not have permission to access this page"
        subTitle="Please contact the administrator if you need support."
        extra={
          <Button type="primary" onClick={() => navigate("/")}>
            Go to Home
          </Button>
        }
      />
    </div>
  );
};

export default IsNotAllowPAge;