import js from "@eslint/js";
import tseslint from "typescript-eslint";

export const BOUNDARY_PATTERNS = {
  contracts: [
    {
      group: [
        "@luxestay/domain",
        "@luxestay/domain/*",
        "@luxestay/api",
        "@luxestay/api/*",
        "@luxestay/web",
        "@luxestay/web/*",
        "**/packages/domain/**",
        "**/apps/**",
      ],
      message:
        "@luxestay/contracts is the bottom contract layer and must not depend on domain or apps.",
    },
    {
      group: ["react", "react-dom", "next", "next/*", "hono", "hono/*"],
      message: "@luxestay/contracts must stay framework-agnostic (TypeScript + Zod only).",
    },
  ],

  domain: [
    {
      group: [
        "@luxestay/api",
        "@luxestay/api/*",
        "@luxestay/web",
        "@luxestay/web/*",
        "**/apps/**",
      ],
      message: "@luxestay/domain is pure domain logic and must not depend on apps/api or apps/web.",
    },
    {
      group: ["react", "react-dom", "next", "next/*", "hono", "hono/*"],
      message: "@luxestay/domain must remain pure TypeScript with zero UI or HTTP framework imports.",
    },
  ],

  apiBase: [
    {
      group: ["@luxestay/web", "@luxestay/web/*", "**/apps/web/**"],
      message: "apps/api must never import directly from apps/web.",
    },
    {
      group: ["react", "react-dom", "next", "next/*"],
      message: "apps/api is a standalone Hono backend and must not import React or Next.js.",
    },
  ],

  apiRoutesAndServices: [
    {
      group: ["@luxestay/web", "@luxestay/web/*", "**/apps/web/**"],
      message: "apps/api must never import directly from apps/web.",
    },
    {
      group: ["react", "react-dom", "next", "next/*"],
      message: "apps/api is a standalone Hono backend and must not import React or Next.js.",
    },
    {
      group: ["@luxestay/domain/seed", "@luxestay/domain/seed/*"],
      message:
        "API routes and services must read data through repository seams, not directly from @luxestay/domain/seed.",
    },
  ],

  webBase: [
    {
      group: ["@luxestay/api", "@luxestay/api/*", "**/apps/api/**", "hono", "hono/*"],
      message:
        "apps/web must communicate with apps/api via HTTP contracts (@luxestay/contracts), never direct imports.",
    },
  ],

  webUiAndRoutes: [
    {
      group: ["@luxestay/api", "@luxestay/api/*", "**/apps/api/**", "hono", "hono/*"],
      message:
        "apps/web must communicate with apps/api via HTTP contracts (@luxestay/contracts), never direct imports.",
    },
    {
      group: ["@luxestay/domain/seed", "@luxestay/domain/seed/*"],
      message:
        "UI features and routes must read data via shared/ports or CatalogContext, never directly from @luxestay/domain/seed.",
    },
  ],
};

export function createNodeWorkspaceEslintConfig(options) {
  const { basePatterns, scopedRules = [], ignores = [] } = options;

  return tseslint.config(
    {
      ignores: ["dist/**", "node_modules/**", "coverage/**", ...ignores],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      files: ["**/*.{ts,mts,cts}"],
      rules: {
        "no-restricted-imports": ["error", { patterns: basePatterns }],
        "@typescript-eslint/no-unused-vars": [
          "error",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
      },
    },
    ...scopedRules
  );
}
