import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getCurrentWeather,
  getForecast,
  geocodeSearch,
  reverseGeocode,
} from "@/lib/weather.functions";
import { Globe } from "@/components/weather/Globe";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { HourlyChart } from "@/components/weather/HourlyChart";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Atlas Weather — Live 3D Globe Dashboard" },
      {
        name: "description",
        content:
          "Explore real-time weather across the planet on an interactive 3D globe. Search any city, see hourly trends and 7-day forecasts.",
      },
    ],
  }),
});

type Location = { name: string; country: string; lat: number; lon: number; state?: string };

function Dashboard() {
  const fetchCurrent = useServerFn(getCurrentWeather);
  const fetchForecast = useServerFn(getForecast);
  const fetchSearch = useServerFn(geocodeSearch);
  const fetchReverse = useServerFn(reverseGeocode);

  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [location, setLocation] = useState<Location | null>(null);
  const [current, setCurrent] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [recents, setRecents] = useState<Location[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recents
  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem("recent_locations") ?? "[]");
      setRecents(r);
    } catch {}
    // Default: London
    selectLocation({ name: "London", country: "GB", lat: 51.5074, lon: -0.1278 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unitSymbol = units === "metric" ? "°C" : "°F";
  const wind = units === "metric" ? "m/s" : "mph";

  async function loadWeather(loc: Location, u = units) {
    setLoading(true);
    setError(null);
    try {
      const [c, f] = await Promise.all([
        fetchCurrent({ data: { lat: loc.lat, lon: loc.lon, units: u } }),
        fetchForecast({ data: { lat: loc.lat, lon: loc.lon, units: u } }),
      ]);
      setCurrent(c);
      setForecast(f);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load weather");
    } finally {
      setLoading(false);
    }
  }

  function selectLocation(loc: Location) {
    setLocation(loc);
    setSuggestions([]);
    setQuery("");
    setRecents((prev) => {
      const next = [loc, ...prev.filter((p) => !(p.lat === loc.lat && p.lon === loc.lon))].slice(0, 6);
      localStorage.setItem("recent_locations", JSON.stringify(next));
      return next;
    });
    loadWeather(loc);
  }

  // Debounced autocomplete
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetchSearch({ data: { q: query.trim() } });
        setSuggestions(res as Location[]);
      } catch {}
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSearch]);

  function toggleUnits() {
    const next = units === "metric" ? "imperial" : "metric";
    setUnits(next);
    if (location) loadWeather(location, next);
  }

  async function useGeolocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const places = (await fetchReverse({
            data: { lat: pos.coords.latitude, lon: pos.coords.longitude },
          })) as Location[];
          const p = places[0] ?? {
            name: "My Location",
            country: "",
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          };
          selectLocation({ ...p, lat: pos.coords.latitude, lon: pos.coords.longitude });
        } catch {
          selectLocation({
            name: "My Location",
            country: "",
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
        }
      },
      () => setError("Geolocation denied"),
    );
  }

  async function pickFromGlobe(lat: number, lon: number) {
    try {
      const places = (await fetchReverse({ data: { lat, lon } })) as Location[];
      const p = places[0];
      if (p) selectLocation({ ...p, lat, lon });
      else setError("No place found at this location (likely ocean).");
    } catch {
      setError("Could not resolve that location.");
    }
  }

  const hourlyPoints = useMemo(() => {
    if (!forecast?.list) return [];
    return forecast.list.slice(0, 8).map((it: any) => ({
      time: new Date(it.dt * 1000).toLocaleTimeString([], { hour: "2-digit" }),
      temp: Math.round(it.main.temp),
    }));
  }, [forecast]);

  const dailyForecast = useMemo(() => {
    if (!forecast?.list) return [];
    const byDay = new Map<string, any[]>();
    for (const it of forecast.list) {
      const d = new Date(it.dt * 1000).toISOString().slice(0, 10);
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d)!.push(it);
    }
    return Array.from(byDay.entries())
      .slice(0, 7)
      .map(([d, items]) => {
        const temps = items.map((i) => i.main.temp);
        const mid = items[Math.floor(items.length / 2)];
        return {
          date: d,
          min: Math.round(Math.min(...temps)),
          max: Math.round(Math.max(...temps)),
          icon: mid.weather[0].icon,
          desc: mid.weather[0].main,
        };
      });
  }, [forecast]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-blue-600">◐</span> Atlas Weather
          </h1>
          <div className="flex-1 min-w-[240px] relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any city…"
              className="w-full rounded-full border border-slate-200 px-5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <AnimatePresence>
              {suggestions.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
                >
                  {suggestions.map((s, i) => (
                    <li
                      key={i}
                      onClick={() => selectLocation(s)}
                      className="px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer flex justify-between"
                    >
                      <span>
                        {s.name}
                        {s.state ? `, ${s.state}` : ""}
                      </span>
                      <span className="text-slate-400">{s.country}</span>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={useGeolocation}
            className="text-sm px-4 py-2 rounded-full border border-slate-200 hover:bg-slate-50"
          >
            📍 Use my location
          </button>
          <button
            onClick={toggleUnits}
            className="text-sm px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700"
          >
            {unitSymbol}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-5 gap-6">
        {/* Globe */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3 rounded-3xl bg-gradient-to-br from-blue-50 to-slate-50 border border-slate-100 overflow-hidden relative h-[460px] lg:h-[620px]"
        >
          <Globe onPick={pickFromGlobe} marker={location} />
          <div className="absolute bottom-4 left-4 right-4 text-xs text-slate-500 bg-white/70 backdrop-blur px-3 py-2 rounded-lg">
            Drag to rotate • Click anywhere on land to fetch live weather
          </div>
        </motion.section>

        {/* Current */}
        <section className="lg:col-span-2 space-y-6">
          <motion.div
            key={location?.name + units}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-slate-100 p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200"
          >
            {loading || !current ? (
              <Skeleton tall />
            ) : error ? (
              <ErrorBox msg={error} onRetry={() => location && loadWeather(location)} />
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">{current.sys?.country}</p>
                    <h2 className="text-3xl font-bold">{current.name || location?.name}</h2>
                    <p className="capitalize text-blue-100 mt-1">
                      {current.weather?.[0]?.description}
                    </p>
                  </div>
                  <WeatherIcon code={current.weather?.[0]?.icon ?? "01d"} size={88} />
                </div>
                <div className="mt-6 flex items-end gap-2">
                  <span className="text-7xl font-bold">{Math.round(current.main.temp)}</span>
                  <span className="text-2xl mb-2">{unitSymbol}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-6 text-sm">
                  <Stat label="Feels" value={`${Math.round(current.main.feels_like)}${unitSymbol}`} />
                  <Stat label="Humidity" value={`${current.main.humidity}%`} />
                  <Stat label="Wind" value={`${Math.round(current.wind.speed)} ${wind}`} />
                </div>
              </>
            )}
          </motion.div>

          {recents.length > 0 && (
            <div className="rounded-3xl border border-slate-100 p-5 bg-white">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Recent</p>
              <div className="flex flex-wrap gap-2">
                {recents.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => selectLocation(r)}
                    className="text-sm px-3 py-1.5 rounded-full bg-slate-50 hover:bg-blue-50 border border-slate-100"
                  >
                    {r.name} <span className="text-slate-400">{r.country}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Hourly chart */}
        <section className="lg:col-span-3 rounded-3xl border border-slate-100 p-6 bg-white">
          <h3 className="font-semibold mb-4">Next 24 hours</h3>
          <div className="h-64">
            {loading || !forecast ? (
              <Skeleton />
            ) : (
              <HourlyChart points={hourlyPoints} unit={unitSymbol} />
            )}
          </div>
        </section>

        {/* 7-day */}
        <section className="lg:col-span-2 rounded-3xl border border-slate-100 p-6 bg-white">
          <h3 className="font-semibold mb-4">7-day forecast</h3>
          {loading || !forecast ? (
            <Skeleton />
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {dailyForecast.map((d) => (
                <li
                  key={d.date}
                  className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                >
                  <span className="text-sm font-medium w-20">
                    {new Date(d.date).toLocaleDateString([], { weekday: "short" })}
                  </span>
                  <WeatherIcon code={d.icon} size={32} />
                  <span className="text-xs text-slate-500 capitalize w-20 text-right">{d.desc}</span>
                  <span className="text-sm tabular-nums w-20 text-right">
                    {d.min}° / {d.max}°
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-8 text-xs text-slate-400">
        Data by OpenWeather • Built with Three.js & TanStack Start
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/15 rounded-xl px-3 py-2 backdrop-blur">
      <p className="text-blue-100 text-[11px]">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function Skeleton({ tall }: { tall?: boolean }) {
  return (
    <div className={`animate-pulse space-y-3 ${tall ? "h-56" : "h-full"}`}>
      <div className="h-4 bg-slate-200/40 rounded w-1/3" />
      <div className="h-10 bg-slate-200/40 rounded w-2/3" />
      <div className="h-4 bg-slate-200/40 rounded w-1/2" />
      <div className="h-20 bg-slate-200/40 rounded" />
    </div>
  );
}

function ErrorBox({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div className="text-center py-6">
      <p className="text-white/90">{msg}</p>
      <button
        onClick={onRetry}
        className="mt-3 px-4 py-2 rounded-full bg-white text-blue-600 text-sm font-medium"
      >
        Retry
      </button>
    </div>
  );
}
