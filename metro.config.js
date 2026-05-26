const path = require("path")
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config")

const rpcWebsocketsBrowserCjs = path.join(__dirname, "node_modules/rpc-websockets/dist/index.browser.cjs")

/**
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      // Several chain libs (viem, bitcoinjs-lib, @solana, ox, bs58check, ...)
      // import "@noble/hashes/crypto.js". The published exports map only lists
      // "./crypto" (no .js). Strip the suffix so Metro resolves via exports
      // instead of falling back to slow file-based resolution.
      if (moduleName === "@noble/hashes/crypto.js" || moduleName.endsWith("/@noble/hashes/crypto.js")) {
        return context.resolveRequest(context, moduleName.replace(/\.js$/, ""), platform)
      }

      // rpc-websockets exports only "browser" / "node" conditions, no "react-native".
      // @solana/web3.js subclasses its Client at import time, so an empty stub
      // breaks "extends undefined". The browser bundle uses the native WebSocket
      // global (which RN provides) and skips the Node "url" + "crypto" deps that
      // the Node bundle requires.
      if (moduleName === "rpc-websockets" || moduleName.startsWith("rpc-websockets/")) {
        return {
          type: "sourceFile",
          filePath: rpcWebsocketsBrowserCjs
        }
      }

      return context.resolveRequest(context, moduleName, platform)
    }
  }
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
