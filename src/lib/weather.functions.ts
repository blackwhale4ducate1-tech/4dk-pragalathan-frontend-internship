import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BASE = "https://api.openweathermap.org";

function key() {
  const k = process.env.OPENWEATHER_API_KEY;
  if (!k) throw new Error("OPENWEATHER_API_KEY not set");
  return k;
}

export const getCurrentWeather = createServerFn({ method: "GET" })
  .inputValidator((d: { lat: number; lon: number; units?: "metric" | "imperial" }) => d)
  .handler(async ({ data }) => {
    const units = data.units ?? "metric";
    const res = await fetch(
      `${BASE}/data/2.5/weather?lat=${data.lat}&lon=${data.lon}&units=${units}&appid=${key()}`,
    );
    if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
    return res.json();
  });

export const getForecast = createServerFn({ method: "GET" })
  .inputValidator((d: { lat: number; lon: number; units?: "metric" | "imperial" }) => d)
  .handler(async ({ data }) => {
    const units = data.units ?? "metric";
    const res = await fetch(
      `${BASE}/data/2.5/forecast?lat=${data.lat}&lon=${data.lon}&units=${units}&appid=${key()}`,
    );
    if (!res.ok) throw new Error(`Forecast fetch failed: ${res.status}`);
    return res.json();
  });

export const geocodeSearch = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ q: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const res = await fetch(
      `${BASE}/geo/1.0/direct?q=${encodeURIComponent(data.q)}&limit=5&appid=${key()}`,
    );
    if (!res.ok) throw new Error(`Geocode failed: ${res.status}`);
    return res.json() as Promise<
      Array<{ name: string; lat: number; lon: number; country: string; state?: string }>
    >;
  });

export const reverseGeocode = createServerFn({ method: "GET" })
  .inputValidator((d: { lat: number; lon: number }) => d)
  .handler(async ({ data }) => {
    const res = await fetch(
      `${BASE}/geo/1.0/reverse?lat=${data.lat}&lon=${data.lon}&limit=1&appid=${key()}`,
    );
    if (!res.ok) throw new Error(`Reverse geocode failed: ${res.status}`);
    return res.json() as Promise<
      Array<{ name: string; lat: number; lon: number; country: string; state?: string }>
    >;
  });
