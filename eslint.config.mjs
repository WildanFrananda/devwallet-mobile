// @ts-check
import eslint from "@eslint/js"
import globals from "globals"
import tseslint from "typescript-eslint"
import reactPlugin from "eslint-plugin-react"
import reactNativePlugin from "eslint-plugin-react-native"

export default tseslint.config(
  {
    ignores: [
      "eslint.config.mjs",
      "dist/",
      "node_modules/",
      "android/",
      "ios/",
      ".bundle/",
      "vendor/",
      "coverage/",
      "e2e/"
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  reactPlugin.configs.flat.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.browser
      },
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.js", "*.mjs", "*.cjs"]
        },
        tsconfigRootDir: /** @type {any} */ (import.meta).dirname,
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      "react-native": reactNativePlugin
    },
    settings: {
      react: {
        version: "19.2"
      }
    }
  },
  {
    rules: {
      // Google style base rules
      "max-len": ["error", { code: 120, tabWidth: 2, "ignoreStrings": true, "ignoreTemplateLiterals": true }],
      "no-tabs": "error",
      indent: ["error", 2, { ignoredNodes: ["PropertyDefinition[decorators]"], "SwitchCase": 1 }],
      "no-mixed-spaces-and-tabs": "error",
      "no-trailing-spaces": "error",
      "linebreak-style": ["error", "unix"],
      "no-multiple-empty-lines": ["error", { max: 2 }],

      // Custom rules
      "new-cap": "off",
      "comma-dangle": ["error", "never"],
      quotes: ["error", "double", { allowTemplateLiterals: true }],
      semi: ["error", "never"],
      "@typescript-eslint/explicit-member-accessibility": "off",
      "object-curly-spacing": "off",
      camelcase: "off",
      "operator-linebreak": "off",
      "valid-jsdoc": "off",
      "require-jsdoc": "off",
      "quote-props": "off",
      "react/no-unescaped-entities": "off",

      // TypeScript rules
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",

      // React / React Native tweaks
      "react/react-in-jsx-scope": "off",
      "react-native/no-unused-styles": "warn",
      "react-native/no-inline-styles": "warn",
      "react-native/split-platform-components": "warn"
    }
  },
  {
    files: ["**/*.spec.ts", "**/*.test.ts", "test/**/*.ts", "e2e/**/*.ts", "**/*.spec.tsx", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "indent": "off"
    }
  },
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off"
    }
  }
)
