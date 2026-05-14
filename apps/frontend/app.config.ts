import { defineConfig } from "@tanstack/start/config";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  routers: {
    ssr: {
      entry: "./src/ssr.tsx",
    },
    client: {
      entry: "./src/client.tsx",
    },
  },
  tsr: {
    routesDirectory: "./src/routes",
    generatedRouteTree: "./src/routeTree.gen.ts",
  },
  vite: {
    plugins: [tsConfigPaths({ projects: ["./tsconfig.json"] })],
  },
});
