import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

installGlobals();

const MODE = process.env.NODE_ENV;

declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  build: {
    cssMinify: MODE === "production",
    rollupOptions: {
      external: [/node:.*/, "stream", "crypto", "fsevents"],
    },
  },
  server: {
    watch: {
      ignored: ["**/playwright-report/**"],
    },
  },
  plugins: [
    process.env.NODE_ENV === "test"
      ? null
      : remix({
          future: {
            v3_fetcherPersist: true,
            v3_relativeSplatPath: true,
            v3_throwAbortReason: true,
            v3_singleFetch: true,
            v3_lazyRouteDiscovery: true,
          },
          ignoredRouteFiles: ["**/*.css"],
        }),
    tsconfigPaths(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./app/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'app/apis/**/*.{ts,tsx}',
        'app/components/auth/**/*.{ts,tsx}',
        'app/components/DispatchMapComponent.tsx',
        'app/components/MapComponent.tsx',
        'app/components/LayerControlPanel.tsx',
        'app/lib/utils.ts',
      ],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/*.d.ts',
        'node_modules/',
        'build/',
        'public/',
        'unittests-remix/**',
        'coverage/**',
        'app/components/auth/signup-form.tsx',
      ],
      all: true,
      thresholds: {
        global: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
    include: ['app/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'build',
      'public',
      'unittests-remix',
      'coverage',
    ],
    restoreMocks: true,
    alias: {
      "~": "/app",
    },
  },
});
