import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://shkeeno.com",
  build: {
    inlineStylesheets: "always",
  },
});
