import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      react(),
      nodePolyfills({
        include: ["buffer"],
        globals: {
          Buffer: true,
        },
      }),
      wasm(),
    ],
    build: {
      target: "esnext",
      rollupOptions: {
        output: {
          manualChunks: {
            // Keep ZK proof generation in its own chunk — only loaded on /play
            "zk-prover": ["@noir-lang/noir_js", "@aztec/bb.js"],
            // Stellar SDK is heavy, separate it
            "stellar-sdk": ["@stellar/stellar-sdk"],
            // React + router in the main chunk
            "react-vendor": ["react", "react-dom", "react-router-dom"],
          },
        },
      },
    },
    optimizeDeps: {
      exclude: ["@stellar/stellar-xdr-json"],
    },
    define: {
      global: "window",
    },
    envPrefix: ["PUBLIC_", "VITE_"],
    server: {
      proxy: {
        "/friendbot": {
          target: "http://localhost:8000/friendbot",
          changeOrigin: true,
        },
      },
    },
  };
});
