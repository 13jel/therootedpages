export function parseThemes(themeString) {
  if (!themeString) return [];
  return themeString
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
