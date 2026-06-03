import React from "react";

type PlatformStatCardProps = {
  icon: React.ReactNode;
  tone: "blue" | "green" | "amber";
  value: React.ReactNode;
  label: string;
  valueClassName?: string;
};

const PlatformStatCard: React.FC<PlatformStatCardProps> = ({ icon, tone, value, label, valueClassName }) => (
  <div className="platform-stat-card">
    <div className={`platform-stat-icon ${tone}`}>{icon}</div>
    <div>
      <div className={`platform-stat-value ${valueClassName || ""}`.trim()}>{value}</div>
      <div className="platform-stat-label">{label}</div>
    </div>
  </div>
);

export default PlatformStatCard;
