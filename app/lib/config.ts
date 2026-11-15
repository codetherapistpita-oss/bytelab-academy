export const appConfig = {
  academyName: "Byte Soma",
  tagline: "Practical skills. Intelligent futures.",
  appsScriptUrl: process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ?? "",
  firebaseApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  firebaseAuthDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  firebaseProjectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  firebaseAppId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

export const isConfigured = Boolean(
  appConfig.appsScriptUrl &&
    appConfig.firebaseApiKey &&
    appConfig.firebaseAuthDomain &&
    appConfig.firebaseProjectId &&
    appConfig.firebaseAppId,
);