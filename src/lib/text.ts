const smallTitleWords = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "with"]);

export function toTitleCase(value: string) {
  return String(value || "")
    .toLowerCase()
    .split(/(\s+|[-/])/)
    .map((part, index) => {
      if (!part.trim() || part === "-" || part === "/") return part;
      if (index > 0 && smallTitleWords.has(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}
