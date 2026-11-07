export const PACKAGE_LABELS = {
  academic: "Academic Exam Prep Bundle",
  primary: "Primary Prep Bundle",
  middle: "Middle Prep Bundle",
  secondary: "Secondary Prep Bundle",
  "office-skills": "Office Skills for Students",
  "professional-tech": "Professional Technology Skills",
};

export function getPackageLabel(packageType) {
  if (!packageType) return "No Active Package";
  return PACKAGE_LABELS[packageType] || packageType;
}

export function getUserInitials(fullName, fallback = "S") {
  const words = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return fallback;
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
