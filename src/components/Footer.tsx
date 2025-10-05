import React from "react";
import { Layout, Typography } from "antd";

const { Footer: AntFooter } = Layout;
const { Text, Link } = Typography;

const Footer: React.FC = () => (
  <AntFooter style={{ textAlign: "center", background: "#fff", padding: "16px 0" }}>
    <Text type="secondary">
      © {new Date().getFullYear()} Attendify. All rights reserved. | Developed by&nbsp;
      <Link href="https://your-portfolio-link.com" target="_blank" rel="noopener">
        Your Name
      </Link>
    </Text>
  </AntFooter>
);

export default Footer;