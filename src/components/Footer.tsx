import React from "react";
import { Layout, Typography } from "antd";

const { Footer: AntFooter } = Layout;
const { Text, Link } = Typography;

const Footer: React.FC = () => (
  <AntFooter style={{ textAlign: "center", background: "#fff", padding: "16px 0" }}>
    <Text type="secondary">
      © {new Date().getFullYear()} FRID. All rights reserved. | Developed by&nbsp;
      <Link href="https://github.com/PBL6-FRID" target="_blank" rel="noopener">
        SV-DUT
      </Link>
    </Text>
  </AntFooter>
);

export default Footer;