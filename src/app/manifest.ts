import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "K, coach de développement personnel",
    short_name: "K",
    description: "Habitudes, journal émotionnel et feuille de route sur 5 ans.",
    lang: "fr",
    start_url: "/aujourdhui",
    scope: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#0f766e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
