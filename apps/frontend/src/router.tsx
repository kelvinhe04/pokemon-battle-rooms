import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function createRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: "intent",
    defaultErrorComponent: ({ error }) => (
      <div style={{ padding: 24 }}>Error: {(error as Error).message}</div>
    ),
    defaultNotFoundComponent: () => <div style={{ padding: 24 }}>404</div>,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
