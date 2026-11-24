import {
  BOUNDARY_PATTERNS,
  createNodeWorkspaceEslintConfig,
} from "../../eslint.boundaries.mjs";

export default createNodeWorkspaceEslintConfig({
  basePatterns: BOUNDARY_PATTERNS.apiBase,
  scopedRules: [
    {
      files: ["src/modules/**/routes.ts", "src/modules/**/service.ts"],
      rules: {
        "no-restricted-imports": [
          "error",
          { patterns: BOUNDARY_PATTERNS.apiRoutesAndServices },
        ],
      },
    },
  ],
});
