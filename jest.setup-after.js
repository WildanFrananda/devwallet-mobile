// Runs AFTER the test framework is installed (so `expect` exists), unlike
// jest.setup.js (setupFiles). Registers RNTL's jest-native custom matchers:
// toBeVisible, toHaveTextContent, toBeDisabled, toBeEmptyElement, …
require("@testing-library/jest-native/extend-expect")
