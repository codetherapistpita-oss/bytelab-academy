export const appConfig = {
  academyName: "ByteLab Academy",
  tagline: "Practical skills. Intelligent futures.",
  appsScriptUrl: process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ?? "",
  firebaseApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
};

export const isConfigured = Boolean(
  appConfig.appsScriptUrl && appConfig.firebaseApiKey,
);
