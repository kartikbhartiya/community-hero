import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; priority: number; freq: "daily" | "weekly" }[] = [
    { path: "", priority: 1.0, freq: "daily" },
    { path: "/map", priority: 0.9, freq: "daily" },
    { path: "/feed", priority: 0.8, freq: "daily" },
    { path: "/leaderboard", priority: 0.7, freq: "daily" },
    { path: "/scorecards", priority: 0.7, freq: "weekly" },
    { path: "/report", priority: 0.6, freq: "weekly" },
  ];
  return routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }));
}
