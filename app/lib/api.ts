import { appConfig } from "./config";
import type { Course } from "../data/courses";

export type EnrollmentPayload = {
  courseId: string;
  courseTitle: string;
  fullName: string;
  age: number;
  phone: string;
  whatsapp: string;
  district: string;
  education: string;
  occupation: string;
  learningMode: string;
  experience: string;
  goals: string;
  consent: boolean;
  website?: string;
};

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export async function fetchPublicCourses(): Promise<Course[]> {
  if (!appConfig.appsScriptUrl) return [];
  const separator = appConfig.appsScriptUrl.includes("?") ? "&" : "?";
  const response = await fetch(`${appConfig.appsScriptUrl}${separator}action=courses`, {
    method: "GET",
    redirect: "follow",
  });
  const result = (await response.json()) as ApiResponse<Course[]>;
  if (!result.ok || !Array.isArray(result.data)) return [];
  return result.data;
}

export async function postToAcademy<T>(
  action: string,
  idToken: string,
  payload: object = {},
): Promise<T> {
  if (!appConfig.appsScriptUrl) {
    throw new Error(
      "Enrollment storage is not connected yet. Add the Apps Script URL from the setup guide.",
    );
  }

  const response = await fetch(appConfig.appsScriptUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, idToken, payload }),
    redirect: "follow",
  });

  const result = (await response.json()) as ApiResponse<T>;
  if (!result.ok) {
    throw new Error(result.error ?? "The academy service could not complete the request.");
  }
  return result.data as T;
}

export async function submitEnrollment(
  idToken: string,
  payload: EnrollmentPayload,
) {
  return postToAcademy<{ enrollmentId: string; status: string }>(
    "enroll",
    idToken,
    payload,
  );
}
