import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import IsNotAllowPAge from "../pages/AuthPage/IsNotAllowPAge";
import { getStoredTenantSlug, stripTenantPrefix, tenantPath } from "@/utils/tenantRouting";
import { getPublicTenant } from "@/apis/platformAPIs/platform";
import NotFound from "@/pages/NotFound/NotFound";

const roleBasePaths: Record<string, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
};

const ProtectedRoute: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { tenantSlug } = useParams<{ tenantSlug?: string }>();
  const storedTenantSlug = getStoredTenantSlug();
  const activeTenantSlug = tenantSlug || storedTenantSlug;
  const [tenantExists, setTenantExists] = useState<boolean | null>(tenantSlug ? null : true);
  const isTenantMismatch = !!tenantSlug && !!storedTenantSlug && tenantSlug !== storedTenantSlug;

  useEffect(() => {
    if (!tenantSlug || isTenantMismatch) {
      setTenantExists(true);
      return;
    }

    let active = true;
    setTenantExists(null);
    getPublicTenant(tenantSlug)
      .then(() => {
        if (active) setTenantExists(true);
      })
      .catch(() => {
        if (active) setTenantExists(false);
      });

    return () => {
      active = false;
    };
  }, [tenantSlug, isTenantMismatch]);

  if (isTenantMismatch) {
    return <NotFound />;
  }

  if (tenantSlug && tenantExists === null) {
    return null;
  }

  if (tenantSlug && tenantExists === false) {
    return <NotFound />;
  }

  if (!user) {
    return <Navigate to={activeTenantSlug ? `/${activeTenantSlug}/login` : "/auth"} replace />;
  }

  if (!tenantSlug && storedTenantSlug && /^\/(admin|teacher|student)(\/|$)/.test(location.pathname)) {
    return (
      <Navigate
        to={tenantPath(location.pathname + location.search, storedTenantSlug)}
        replace
        state={location.state}
      />
    );
  }

  const tenantlessPath = stripTenantPrefix(location.pathname, tenantSlug);
  const roleBasePath = roleBasePaths[user.role as string];
  const isAllowed = !!roleBasePath && tenantlessPath.startsWith(roleBasePath);

  if (!isAllowed) {
    return <IsNotAllowPAge />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
