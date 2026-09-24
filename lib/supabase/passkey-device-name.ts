// WebAuthn no expone el nombre del dispositivo. Se deduce combinando el gestor
// de la passkey (por su AAGUID) con el sistema y navegador del User-Agent.

// Subconjunto de https://github.com/passkeydeveloper/passkey-authenticator-aaguids
const KNOWN_PROVIDERS: Record<string, string> = {
  "ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4": "Google Password Manager",
  "adce0002-35bc-c60a-648b-0b25f1f05503": "Perfil de Chrome",
  "771b48fd-d3d4-4f74-9232-fc157ab0507a": "Perfil de Edge",
  "b5397666-4885-aa6b-cebf-e52262a439a2": "Chromium",
  "08987058-cadc-4b81-b6e1-30de50dcbe96": "Windows Hello",
  "9ddd1817-af5a-4672-a2b9-3e3dd95000a9": "Windows Hello",
  "6028b017-b1d4-4c02-b4b3-afcdafc96bb2": "Windows Hello",
  "fbfc3007-154e-4ecc-8c0b-6e020557d7bd": "iCloud Keychain",
  "dd4ec289-e01d-41c9-bb89-70fa845d4bf2": "iCloud Keychain",
  "53414d53-554e-4700-0000-000000000000": "Samsung Pass",
  "bada5566-a7aa-401f-bd96-45619a55120d": "1Password",
  "d548826e-79b4-db40-a3d8-11116f7e8349": "Bitwarden",
  "531126d6-e717-415c-9320-3d9aa6981239": "Dashlane",
  "b84e4048-15dc-4dd0-8640-f4f60813c8af": "NordPass",
  "0ea242b4-43c4-4a1b-8b17-dd6d0b6baec6": "Keeper",
};

function deviceFromUserAgent(userAgent: string) {
  if (/iPhone/i.test(userAgent)) return "iPhone";
  if (/iPad/i.test(userAgent)) return "iPad";
  if (/Android/i.test(userAgent)) {
    // Ej.: "Linux; Android 14; SM-S918B)" → "SM-S918B"
    const model = userAgent.match(/Android [^;)]*;\s*([^;)]+?)(?:\s+Build\/[^;)]*)?\)/i)?.[1]?.trim();
    return model && model !== "K" ? model : "Android";
  }
  if (/CrOS/i.test(userAgent)) return "Chromebook";
  if (/Macintosh|Mac OS X/i.test(userAgent)) return "Mac";
  if (/Windows/i.test(userAgent)) return "PC con Windows";
  if (/Linux/i.test(userAgent)) return "Linux";
  return null;
}

function browserFromUserAgent(userAgent: string) {
  if (/Edg(A|iOS)?\//i.test(userAgent)) return "Edge";
  if (/OPR\/|Opera/i.test(userAgent)) return "Opera";
  if (/SamsungBrowser/i.test(userAgent)) return "Samsung Internet";
  if (/Firefox|FxiOS/i.test(userAgent)) return "Firefox";
  if (/Chrome|CriOS/i.test(userAgent)) return "Chrome";
  if (/Safari/i.test(userAgent)) return "Safari";
  return null;
}

export function passkeyDeviceName(aaguid: string, userAgent: string | null) {
  const provider = KNOWN_PROVIDERS[aaguid.toLowerCase()];
  const device = userAgent ? deviceFromUserAgent(userAgent) : null;
  const browser = userAgent ? browserFromUserAgent(userAgent) : null;

  const parts = provider
    ? [device, provider]
    : [device, browser];
  const name = parts.filter(Boolean).join(" · ") || "Passkey";
  return name.slice(0, 60);
}
