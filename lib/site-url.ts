const DEFAULT_APP_URL = "https://gympulse.space";

function normalizeUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

function isLocalhost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function getAppUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;

  if (configuredUrl) {
    return normalizeUrl(configuredUrl);
  }

  if (typeof window !== "undefined") {
    if (isLocalhost(window.location.hostname)) {
      return normalizeUrl(window.location.origin);
    }

    return DEFAULT_APP_URL;
  }

  return DEFAULT_APP_URL;
}

export function getAuthCallbackUrl() {
  return new URL("/auth/callback", getAppUrl()).toString();
}
