import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { appConfig } from "./config";

const firebaseConfig = {
  apiKey: appConfig.firebaseApiKey,
  authDomain: appConfig.firebaseAuthDomain,
  projectId: appConfig.firebaseProjectId,
  appId: appConfig.firebaseAppId,
};

const firebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(firebaseApp);