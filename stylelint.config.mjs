const config = {
  extends: ["stylelint-config-standard"],
  plugins: ["./tooling/stylelint-tokens.mjs"],
  ignoreFiles: ["src/styles/tokens.css", "vendor/**"],
  rules: {
    "nilecruz/use-tokens": true,
    // CSS Modules class names are camelCase.
    "selector-class-pattern": "^[a-z][a-zA-Z0-9]*$|^(js-only|visually-hidden)$",
    "keyframes-name-pattern": null,
    "media-feature-range-notation": null,
    "import-notation": "string",
    // CSS Modules: :global(...) is valid.
    "selector-pseudo-class-no-unknown": [true, { ignorePseudoClasses: ["global"] }],
    // Ordering-only rule; it reports equal-specificity selectors in different blocks, not real conflicts.
    "no-descending-specificity": null,
  },
};

export default config;
