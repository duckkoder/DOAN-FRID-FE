export function toTenantSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function toDatabaseName(slug: string): string {
  const normalized = slug.replace(/-/g, "_").replace(/[^a-z0-9_]/g, "");
  return `frid_${normalized || "school"}_db`;
}

export function toDatabaseUser(slug: string): string {
  const normalized = slug.replace(/-/g, "_").replace(/[^a-z0-9_]/g, "");
  return `db_user_${normalized || "school"}`;
}

export function toStorageBucket(slug: string): string {
  return `bucket-s3-${slug || "school"}`;
}

export function tenantLoginPath(slug: string): string {
  return `/${slug}/login`;
}
