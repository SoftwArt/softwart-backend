// ESLint 9/10 flat config — lint del backend (TypeScript, CommonJS).
// Corre con `npm run lint`. Complementa al type-check: atrapa variables sin usar,
// código sospechoso y malas prácticas que `tsc` no ve.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  // No lintear artefactos ni dependencias.
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "**/*.js"],
  },

  // Reglas base recomendadas (JS + TypeScript, sin type-checking → rápido).
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // Variables/args sin usar → advertencia; ignora los prefijados con "_"
      // (convención para "a propósito no lo uso", p.ej. _req, _next).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
          // permite descartar props con destructuring + ...rest (patrón "quitar
          // la clave de la respuesta": const { clave, ...rest } = user)
          ignoreRestSiblings: true,
        },
      ],
      // `any` explícito → advertencia, no error: el código ya usa algunos casts
      // puntuales (err as any, etc.). No bloquea el CI pero queda visible.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
