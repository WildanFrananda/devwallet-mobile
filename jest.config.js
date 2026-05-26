const esmPackages = [
  "react-native",
  "@react-native",
  "@react-navigation",
  "react-native-mobile-mvvm",
  "react-native-config",
  "react-native-gesture-handler",
  "react-native-screens",
  "react-native-safe-area-context",
  "tsyringe",
  "@scure",
  "@noble",
  "viem"
].join("|")

module.exports = {
  preset: "@react-native/jest-preset",
  transformIgnorePatterns: [`node_modules/(?!(${esmPackages})/)`],
  setupFiles: ["<rootDir>/jest.setup.js"]
}
