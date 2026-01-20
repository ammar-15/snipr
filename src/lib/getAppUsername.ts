export function getAppUsername() {
  const raw = localStorage.getItem("username");
  if (!raw) return null;
  return raw.startsWith("@") ? raw : `@${raw}`;
}