export function getStoredTenantSlug(): string | null {
  return localStorage.getItem("tenantSlug");
}

export function setStoredTenantSlug(slug?: string | null): void {
  if (slug) {
    localStorage.setItem("tenantSlug", slug);
  } else {
    localStorage.removeItem("tenantSlug");
  }
}

export function tenantPath(path: string, slug?: string | null): string {
  if (!slug) return path;
  if (path === "/") return `/${slug}`;
  return `/${slug}${path.startsWith("/") ? path : `/${path}`}`;
}

export function stripTenantPrefix(pathname: string, slug?: string | null): string {
  if (!slug) return pathname;
  if (pathname === `/${slug}`) return "/";
  if (pathname.startsWith(`/${slug}/`)) {
    return pathname.slice(slug.length + 1) || "/";
  }
  return pathname;
}
