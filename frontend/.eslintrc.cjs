module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
  ],
  ignorePatterns: ["dist", "node_modules", ".eslintrc.cjs"],
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  settings: { react: { version: "18.2" } },
  plugins: ["react-refresh"],
  rules: {
    // This codebase does not use PropTypes; typing is out of scope for lint.
    "react/prop-types": "off",
    "react/jsx-no-target-blank": "off",
    // UI copy is Somali/English with many apostrophes (e.g. "su'aal");
    // escaping them all would churn every page for no runtime benefit.
    "react/no-unescaped-entities": "off",
    // Baseline for a previously unlinted codebase: unused PascalCase imports
    // (icons/components) and unused args are tolerated; unused lowercase
    // variables still fail because they usually indicate real logic leftovers.
    "no-unused-vars": ["error", { args: "none", varsIgnorePattern: "^[A-Z_]" }],
    // Effect dependency arrays are long-established here; auto-adding deps
    // now could introduce fetch loops. Revisit deliberately, not via lint.
    "react-hooks/exhaustive-deps": "off",
    "react-refresh/only-export-components": "off",
  },
};
