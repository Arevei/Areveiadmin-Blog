/**
 * The public site prerenders every post at build time (that is what search
 * engines and social crawlers read). When FRONTEND_DEPLOY_HOOK_URL is set,
 * publishing or changing a live post asks the host to rebuild so the static
 * HTML never lags behind the database.
 */
export function triggerSiteRebuild() {
  const hook = process.env.FRONTEND_DEPLOY_HOOK_URL?.trim();
  if (!hook) return;

  fetch(hook, { method: "POST" }).catch((error) => {
    console.error("Site rebuild hook failed", error);
  });
}
