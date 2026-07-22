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
  photo: ImagePayload;
};

export type ImagePayload = { base64: string; mimeType: "image/jpeg" | "image/png" | "image/webp" };

export async function prepareImage(file: File): Promise<{ payload: ImagePayload; preview: string }> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPG, PNG or WebP image.");
  }
  if (file.size > 10 * 1024 * 1024) throw new Error("Choose an image smaller than 10 MB.");
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The selected image could not be read."));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("The selected image is invalid."));
    element.src = source;
  });
  const maximum = 1400;
  const scale = Math.min(1, maximum / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The image could not be prepared.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const preview = canvas.toDataURL("image/jpeg", 0.82);
  const base64 = preview.split(",")[1] || "";
  if (!base64 || base64.length > 3000000) throw new Error("Choose a smaller or lower-resolution image.");
  return { payload: { base64, mimeType: "image/jpeg" }, preview };
}

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
