import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/index.js"),
      name: "DynamicTable",
      cssFileName: "style",
      fileName: (format) =>
        format === "es" ? "dynamic-table.js" : "dynamic-table.umd.cjs",
    },
    rollupOptions: {
      external: [
        "vue",
        "vue-router",
        "element-plus",
        "@element-plus/icons-vue",
      ],
      output: {
        exports: "named",
        globals: {
          vue: "Vue",
          "vue-router": "VueRouter",
          "element-plus": "ElementPlus",
          "@element-plus/icons-vue": "ElementPlusIconsVue",
        },
      },
    },
  },
  test: {
    environment: "node",
  },
});
