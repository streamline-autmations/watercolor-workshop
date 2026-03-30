import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    dyadComponentTagger(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["blom-academy-favicon.webp"],
      manifest: {
        name: "BLOM Academy",
        short_name: "BLOM Academy",
        description: "Learn beautiful nail art techniques with BLOM Academy",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        id: "/",
        icons: [
          {
            src: "/blom-academy-favicon.webp",
            sizes: "192x192",
            type: "image/webp",
            purpose: "any maskable"
          },
          {
            src: "/blom-academy-favicon.webp",
            sizes: "512x512",
            type: "image/webp",
            purpose: "any maskable"
          },
          {
            src: "/blom-academy-favicon.webp",
            sizes: "512x512",
            type: "image/webp",
            purpose: "any"
          }
        ],
        categories: ["education", "lifestyle"],
        shortcuts: [
          {
            name: "Explore Courses",
            short_name: "Courses",
            url: "/explore",
            description: "Browse all available courses"
          },
          {
            name: "My Profile",
            short_name: "Profile",
            url: "/profile",
            description: "View your profile and enrollments"
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
