/**
 * Build autônomo do simulador: um único arquivo JS e um único CSS, sem
 * divisão de código, prontos para serem embutidos em uma página distribuível
 * por `scripts/empacotar-tco.mjs`.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: {
    outDir: "dist-tco",
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      input: path.resolve(__dirname, "standalone.html"),
      output: { inlineDynamicImports: true },
    },
  },
});
