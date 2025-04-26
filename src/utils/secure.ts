/**
 * Get fake UUID
 */
export function getUUID() {
  const hexDigits = "0123456789ABCDEF";
  let uuid = "";
  for (let i = 0; i < 32; i++) {
    const randomDigit = Math.floor(Math.random() * 16);
    uuid += hexDigits[randomDigit];
  }
  return uuid;
}

export function generateUUIDv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

const windowsNames = [
  "admin",
  "administrator",
  "user",
  "guest",
  "root",
  "manager",
  "pc",
  "windows",
  "msi",
  "asus",
  "lenovo",
  "acer",
];

export function randomDeviceName() {
  return windowsNames[Math.floor(Math.random() * windowsNames.length)];
}

export function randomBase64(length = 32) {
  return btoa(
    String.fromCharCode(
      ...Array.from({ length }, () => Math.floor(Math.random() * 256)),
    ),
  );
}
