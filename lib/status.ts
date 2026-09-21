export const STATUSES = [
  { value: "WISHLIST", label: "Wishlist" },
  { value: "APPLIED", label: "Applied" },
  { value: "INTERVIEWING", label: "Interviewing" },
  { value: "OFFER", label: "Offer" },
  { value: "REJECTED", label: "Rejected / Closed" },
] as const;

export type ApplicationStatus = (typeof STATUSES)[number]["value"];
