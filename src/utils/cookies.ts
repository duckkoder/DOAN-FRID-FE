// src/utils/cookies.ts
export function setCookie(
  name: string,
  value: string,
  days = 7,
  secure = true,
  sameSite: "Lax" | "Strict" | "None" = "Lax",
  path = "/",
) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const parts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `Expires=${expires}`,
    `Path=${path}`,
    `SameSite=${sameSite}`,
  ];
  if (secure) parts.push("Secure");
  document.cookie = parts.join("; ");
}

export function getCookie(name: string): string | null {
  const key = encodeURIComponent(name) + "=";
  const cookies = document.cookie.split("; ");
  for (const c of cookies) {
    if (c.startsWith(key)) return decodeURIComponent(c.substring(key.length));
  }
  return null;
}

export function deleteCookie(name: string, path = "/") {
  document.cookie = `${encodeURIComponent(name)}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=${path}`;
}
