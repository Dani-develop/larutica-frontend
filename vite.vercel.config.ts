import { defineConfig } from "vite";
import vinext from "vinext";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/postcss";
import { fileURLToPath } from "node:url";

// The existing vite.config.ts remains the Sites/Cloudflare deployment target.
export default defineConfig({
  plugins: [vinext(), nitro()],
  resolve: {
    alias: {
      tailwindcss: fileURLToPath(new URL('./node_modules/tailwindcss/index.css', import.meta.url)),
      'tw-animate-css': fileURLToPath(new URL('./node_modules/tw-animate-css/dist/tw-animate.css', import.meta.url)),
    },
  },
  css: { postcss: { plugins: [tailwindcss()] } },
});
