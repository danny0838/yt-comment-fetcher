import js from "@eslint/js";
import globals from "globals";
import stylistic from "@stylistic/eslint-plugin";

// ref: https://github.com/eslint-stylistic/eslint-stylistic/blob/main/packages/eslint-plugin/configs/customize.ts
const stylisticCustomized = stylistic.configs.customize({
  semi: true,
  jsx: false,
});

export default [
  {
    ignores: [
      "dist",
    ],
  },
  {
    plugins: {
      ...stylisticCustomized.plugins,
    },
    rules: {
      // ref: https://eslint.org/docs/latest/rules/
      ...js.configs.recommended.rules,
      "no-cond-assign": "warn",
      "no-empty": "warn",
      "no-prototype-builtins": "warn",
      "no-redeclare": "warn",
      "no-unused-labels": "warn",
      "no-unused-vars": "warn",

      // ref: https://eslint.style/rules
      ...stylisticCustomized.rules,
      "@stylistic/arrow-parens": "off",
      "@stylistic/brace-style": "off",
      "@stylistic/indent": "off",
      "@stylistic/indent-binary-ops": "off",
      "@stylistic/max-statements-per-line": "off",
      "@stylistic/multiline-ternary": "off",
      "@stylistic/no-mixed-operators": "off",
      "@stylistic/no-multi-spaces": ["error", {ignoreEOLComments: true}],
      "@stylistic/no-multiple-empty-lines": ["error", {max: 2, maxBOF: 0, maxEOF: 0}],
      "@stylistic/object-curly-spacing": ["error", "never"],
      "@stylistic/operator-linebreak": "off",
      "@stylistic/padded-blocks": "off",
      "@stylistic/quote-props": ["error", "consistent"],
      "@stylistic/quotes": "off",
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: [
      "tests/**",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        describe: false,
        it: false,
      },
    },
  },
];
