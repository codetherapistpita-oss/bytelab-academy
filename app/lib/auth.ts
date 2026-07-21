import { appConfig } from "./config";

export type AuthUser = {
  uid: string;
  email: string;
  emailVerified: boolean;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
};

type FirebaseAuthResponse = {
  localId: string;
  email: string;
  idToken: string;
  refreshToken: string;
  expiresIn: string;
};

const SESSION_KEY = "bytelab-academy-session";

function requireApiKey() {
  if (!appConfig.firebaseApiKey) {
    throw new Error(
      "Student accounts are not connected yet. Add the Firebase configuration from the setup guide.",
    );
  }
  return appConfig.firebaseApiKey;
}

async function firebaseRequest<T>(endpoint: string, payload: object): Promise<T> {
  const apiKey = requireApiKey();
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const data = (await response.json()) as T & {
    error?: { message?: string };
  };

  if (!response.ok || data.error) {
    throw new Error(mapAuthError(data.error?.message ?? "AUTH_REQUEST_FAILED"));
  }
  return data;
}

function mapAuthError(code: string) {
  const known: Record<string, string> = {
    EMAIL_EXISTS: "An account already uses this email. Please sign in instead.",
    EMAIL_NOT_FOUND: "No account was found for this email.",
    INVALID_LOGIN_CREDENTIALS: "The email or password is incorrect.",
    INVALID_PASSWORD: "The email or password is incorrect.",
    USER_DISABLED: "This account has been disabled. Contact the academy.",
    WEAK_PASSWORD: "Use a stronger password with at least eight characters.",
    TOO_MANY_ATTEMPTS_TRY_LATER:
      "Too many attempts were made. Please wait and try again.",
    INVALID_EMAIL: "Enter a valid email address.",
  };
  return known[code] ?? "We could not complete that account request. Please try again.";
}

async function accountLookup(idToken: string) {
  const data = await firebaseRequest<{
    users: Array<{ localId: string; email: string; emailVerified?: boolean }>;
  }>("accounts:lookup", { idToken });
  const account = data.users?.[0];
  if (!account) throw new Error("Your account session could not be confirmed.");
  return account;
}

function toUser(response: FirebaseAuthResponse, emailVerified = false): AuthUser {
  return {
    uid: response.localId,
    email: response.email,
    emailVerified,
    idToken: response.idToken,
    refreshToken: response.refreshToken,
    expiresAt: Date.now() + Number(response.expiresIn || 3600) * 1000,
  };
}

export async function signUp(email: string, password: string) {
  const response = await firebaseRequest<FirebaseAuthResponse>("accounts:signUp", {
    email,
    password,
    returnSecureToken: true,
  });
  await firebaseRequest("accounts:sendOobCode", {
    requestType: "VERIFY_EMAIL",
    idToken: response.idToken,
  });
  const user = toUser(response);
  saveSession(user);
  return user;
}

export async function signIn(email: string, password: string) {
  const response = await firebaseRequest<FirebaseAuthResponse>(
    "accounts:signInWithPassword",
    { email, password, returnSecureToken: true },
  );
  const account = await accountLookup(response.idToken);
  const user = toUser(response, Boolean(account.emailVerified));
  saveSession(user);
  return user;
}

export async function sendPasswordReset(email: string) {
  await firebaseRequest("accounts:sendOobCode", {
    requestType: "PASSWORD_RESET",
    email,
  });
}

export async function resendVerification(user: AuthUser) {
  await firebaseRequest("accounts:sendOobCode", {
    requestType: "VERIFY_EMAIL",
    idToken: user.idToken,
  });
}

export async function reloadUser(user: AuthUser) {
  const account = await accountLookup(user.idToken);
  const refreshed = { ...user, emailVerified: Boolean(account.emailVerified) };
  saveSession(refreshed);
  return refreshed;
}

export function saveSession(user: AuthUser) {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }
}

export function loadSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as AuthUser;
    return user.idToken && user.email ? user : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(SESSION_KEY);
  }
}
