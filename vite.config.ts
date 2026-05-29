import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: { host: "::", port: 8080 },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: { maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 },
      manifest: {
        name: "Liftome",
        short_name: "Liftome",
        description: "Aiuto vicino in 10 minuti",
        start_url: "/",
        display: "standalone",
        background_color: "#1A1A2E",
        theme_color: "#FF5A00",
        icons: [
          { src: "/liftome-icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/liftome-icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    }),
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
  }
});
