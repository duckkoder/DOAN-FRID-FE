import React from "react";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { Space, Typography } from "antd";
import { PASSWORD_REQUIREMENTS } from "../utils/passwordValidation";

const { Text } = Typography;

interface PasswordRequirementsProps {
  password: string;
  showTitle?: boolean;
}

/**
 * Component to display password requirements with real-time validation feedback
 */
const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({
  password,
  showTitle = true,
}) => {
  return (
    <div style={{ marginTop: 8 }}>
      {showTitle && (
        <Text strong style={{ display: "block", marginBottom: 8 }}>
          Password Requirements:
        </Text>
      )}
      <Space direction="vertical" size={4}>
        {PASSWORD_REQUIREMENTS.map((requirement, index) => {
          const isMet = password ? requirement.check(password) : false;
          return (
            <div key={index} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isMet ? (
                <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 14 }} />
              ) : (
                <CloseCircleOutlined style={{ color: "#d9d9d9", fontSize: 14 }} />
              )}
              <Text
                style={{
                  color: isMet ? "#52c41a" : password ? "#ff4d4f" : "#8c8c8c",
                  fontSize: 13,
                }}
              >
                {requirement.message}
              </Text>
            </div>
          );
        })}
      </Space>
    </div>
  );
};

export default PasswordRequirements;
