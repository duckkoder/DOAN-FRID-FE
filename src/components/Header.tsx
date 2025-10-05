import React from "react";
import { Avatar, Button, Input } from "antd";
import { BellOutlined, MessageOutlined, UserOutlined } from "@ant-design/icons";

const Header: React.FC<{ username?: string }> = ({ username }) => (
  <div style={{
    width: "100%",
    background: "#fff",
    borderBottom: "1px solid #eaeaea",
    padding: "12px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxSizing: "border-box"
  }}>
    <span style={{ fontSize: 28, fontWeight: "bold", color: "#2563eb" }}>Attendify</span>
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <Input.Search placeholder="Search" style={{ width: 220 }} />
      <BellOutlined style={{ fontSize: 22, color: "#2563eb" }} />
      <MessageOutlined style={{ fontSize: 22, color: "#10b981" }} />
      <Avatar src="https://randomuser.me/api/portraits/men/32.jpg" icon={<UserOutlined />} />
      <span style={{ fontWeight: 500 }}>{username || "User"}</span>
    </div>
  </div>
);

export default Header;