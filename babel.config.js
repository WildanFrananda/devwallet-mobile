module.exports = {
  presets: ["module:@react-native/babel-preset"],
  plugins: [
    // tsyringe needs design:paramtypes metadata at runtime. babel-plugin-
    // transform-typescript-metadata emits the same metadata that `tsc` with
    // `emitDecoratorMetadata: true` would. MUST come BEFORE the decorators
    // plugin per the plugin's README.
    "babel-plugin-transform-typescript-metadata",
    ["@babel/plugin-proposal-decorators", { legacy: true }],
    "@babel/plugin-transform-class-static-block"
  ]
}
