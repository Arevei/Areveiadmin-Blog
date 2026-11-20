/** Origin of the public site. The editor loads its stylesheet and live preview from here. */
export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.arevei.com").trim().replace(/\/$/, "");
}
