import {
  BOUNDARY_PATTERNS,
  createNodeWorkspaceEslintConfig,
} from "../../eslint.boundaries.mjs";

export default createNodeWorkspaceEslintConfig({
  basePatterns: BOUNDARY_PATTERNS.contracts,
});
