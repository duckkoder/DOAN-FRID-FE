import React from "react";
import { Breadcrumb as AntBreadcrumb } from "antd";
import { HomeOutlined } from "@ant-design/icons";

interface BreadcrumbItem {
  title: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  const breadcrumbItems = [
    {
      title: <HomeOutlined />,
      href: "/"
    },
    ...items
  ];

  return (
    <AntBreadcrumb 
      items={breadcrumbItems}
      style={{ 
        marginBottom: 16,
        fontSize: 14,
        color: "#64748b"
      }}
    />
  );
};

export default Breadcrumb;