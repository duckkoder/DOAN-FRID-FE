// simple browser AES-GCM helpers using Web Crypto
const IV_BYTE_LENGTH = 12;

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(b64: string) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Derive a fixed-length key (32 bytes) from an arbitrary passphrase using SHA-256.
async function deriveKeyBytes(keyString: string) {
  const enc = new TextEncoder();
  const keyData = enc.encode(keyString);
  const hash = await crypto.subtle.digest("SHA-256", keyData);
  return new Uint8Array(hash);
}

export async function encryptString(plain: string, keyString: string) {
  const enc = new TextEncoder();
  const keyBytes = await deriveKeyBytes(keyString);
  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, [
    "encrypt",
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTE_LENGTH));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, enc.encode(plain));
  const combined = new Uint8Array(iv.byteLength + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.byteLength);
  return toBase64(combined);
}

export async function decryptString(b64: string, keyString: string) {
  const bytes = fromBase64(b64);
  const iv = bytes.slice(0, IV_BYTE_LENGTH);
  const data = bytes.slice(IV_BYTE_LENGTH);
  const enc = new TextDecoder();
  const keyBytes = await deriveKeyBytes(keyString);
  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, [
    "decrypt",
  ]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, data);
  return enc.decode(plain);
}
