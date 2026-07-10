export function getAppVersion(): string {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
    process.env.NEXT_PUBLIC_APP_VERSION ??
    process.env.npm_package_version ??
    "local-dev"
  );
}

export const APP_VERSION_STORAGE_KEY = "ingeniafood_app_version";
