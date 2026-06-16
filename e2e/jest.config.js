/** Jest config dedicated to Detox E2E specs.
 *  Kept separate from the unit/component Jest config so unit runs don't try
 *  to boot a simulator. */
/** @type {import("@jest/types").Config.InitialOptions} */
module.exports = {
  rootDir: "..",
  testMatch: ["<rootDir>/e2e/**/*.spec.ts"],
  testTimeout: 120000,
  maxWorkers: 1,
  setupFiles: ["<rootDir>/e2e/load-secrets.js"],
  globalSetup: "detox/runners/jest/globalSetup",
  globalTeardown: "detox/runners/jest/globalTeardown",
  reporters: ["detox/runners/jest/reporter"],
  testEnvironment: "detox/runners/jest/testEnvironment",
  verbose: true,
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/e2e/tsconfig.json" }]
  }
}
