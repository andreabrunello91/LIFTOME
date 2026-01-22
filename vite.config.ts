import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["liftome-icon-192.png", "liftome-icon-512.png"],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
      },
      manifest: {
        name: "Liftome",
        short_name: "Liftome",
        description: "Aiuto vicino in 10 minuti",
        start_url: "/app",
        scope: "/",
        display: "standalone",
        background_color: "#FFFFFF",
        theme_color: "#FF5A00",
        orientation: "portrait",
        icons: [
          {
            src: "/liftome-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/liftome-icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
        categories: ["lifestyle", "utilities"],
        lang: "it",
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
