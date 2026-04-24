import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: "typescript", decorators: true },
        transform: { decoratorMetadata: true },
        target: "es2020",
      },
    }),
  ],
  test: {
    globals: true,
    environment: "node",
    fileParallelism: false,
    setupFiles: ["./src/tests/env.setup.ts"],
    testTimeout: 30000,
    coverage: {
      provider: "v8",
      include: ["src/helpers/**", "src/controllers/**"],
      exclude: ["src/tests/**"],
    },
  },
});
