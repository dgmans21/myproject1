export type ApiMode = "mock" | "http" | "hybrid";

export function getApiMode(): ApiMode {
  const explicit = process.env.NEXT_PUBLIC_API_MODE?.trim().toLowerCase();
  if (explicit === "mock" || explicit === "http" || explicit === "hybrid") {
    return explicit;
  }
  if (process.env.NEXT_PUBLIC_API_URL?.trim()) {
    return "hybrid";
  }
  return "mock";
}

export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

}

export function isHttpEnabled(): boolean {
  return getApiMode() !== "mock";
}

