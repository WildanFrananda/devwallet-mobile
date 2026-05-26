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
  "@solana",
  "rpc-websockets",
  "viem",
  "bitcoinjs-lib",
  "uint8array-tools",
  "ed25519-hd-key",
  "varuint-bitcoin",
  "@bitcoinerlab",
  "uuid",
  "@cosmjs",
  "xrpl",
  "ripple-",
  "starknet",
  "@starknet-io"
].join("|")

module.exports = {
  preset: "@react-native/jest-preset",
  transformIgnorePatterns: [`node_modules/(?!(${esmPackages})/)`],
  setupFiles: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@solana/(codecs-numbers|codecs-strings|codecs-core|codecs-data-structures|codecs|errors|options|addresses)$":
      "<rootDir>/node_modules/@solana/$1/dist/index.node.cjs",
    "^rpc-websockets$": "<rootDir>/node_modules/rpc-websockets/dist/index.cjs",
    "^rpc-websockets/dist/lib/client$": "<rootDir>/node_modules/rpc-websockets/dist/index.cjs"
  }
}
