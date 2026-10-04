import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  base: "/yyc-intelligence/",

  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },

  server: {
    port: 5173,

    proxy: {
      "/camera-image": {
        target: "http://trafficcam.calgary.ca",
        changeOrigin: true,
        secure: false,

        rewrite: (path) => {
          const requestUrl = new URL(
            path,
            "http://localhost"
          );

          const cameraUrl =
            requestUrl.searchParams.get("url");

          if (!cameraUrl) {
            return "/";
          }

          const parsedCameraUrl =
            new URL(cameraUrl);

          return parsedCameraUrl.pathname;
        },

        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader(
              "Host",
              "trafficcam.calgary.ca"
            );

            proxyReq.setHeader(
              "Referer",
              "https://www.calgary.ca/"
            );

            proxyReq.setHeader(
              "User-Agent",
              "Mozilla/5.0"
            );

            proxyReq.setHeader(
              "Accept",
              "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
            );
          });

          proxy.on("proxyRes", (proxyRes) => {
            proxyRes.headers["cache-control"] =
              "no-store";
          });
        },
      },

      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});