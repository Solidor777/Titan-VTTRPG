// vite.config.mjs
import { svelte } from "file:///C:/FoundryVTT/Dev/foundryuserdata/Data/systems/titan-rebuild/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import resolve from "file:///C:/FoundryVTT/Dev/foundryuserdata/Data/systems/titan-rebuild/node_modules/@rollup/plugin-node-resolve/dist/es/index.js";
import preprocess from "file:///C:/FoundryVTT/Dev/foundryuserdata/Data/systems/titan-rebuild/node_modules/svelte-preprocess/dist/index.js";
import { postcssConfig, terserConfig } from "file:///C:/FoundryVTT/Dev/foundryuserdata/Data/systems/titan-rebuild/node_modules/@typhonjs-fvtt/runtime/.rollup/remote/index.js";
import path from "path";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///C:/FoundryVTT/Dev/foundryuserdata/Data/systems/titan-rebuild/vite.config.mjs";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = path.dirname(__filename);
var s_PACKAGE_ID = "systems/titan-rebuild";
var s_COMPRESS = false;
var s_SOURCEMAPS = true;
var s_RESOLVE_CONFIG = {
  browser: true,
  dedupe: ["svelte"]
};
var vite_config_default = () => {
  return {
    root: "src/",
    // Source location / esbuild root.
    base: `/${s_PACKAGE_ID}/`,
    // Base module path that 30001 / served dev directory.
    publicDir: false,
    // No public resources to copy.
    cacheDir: "../.vite-cache",
    // Relative from root directory.
    resolve: {
      conditions: ["import", "browser"],
      alias: {
        "~/": `${path.resolve(__dirname, "src")}/`
      }
    },
    esbuild: {
      target: ["es2022"]
    },
    css: {
      // Creates a standard configuration for PostCSS with autoprefixer & postcss-preset-env.
      postcss: postcssConfig({ compress: s_COMPRESS, sourceMap: s_SOURCEMAPS })
    },
    define: {
      process: {
        env: {
          NODE_ENV: "production"
        }
      }
    },
    // About server options:
    // - Set to `open` to boolean `false` to not open a browser window automatically. This is useful if you set up a
    // debugger instance in your IDE and launch it with the URL: 'http://localhost:30001/game'.
    //
    // - The top proxy entry redirects requests under the module path for `style.css` and following standard static
    // directories: `assets`, `lang`, and `packs` and will pull those resources from the main Foundry / 30000 server.
    // This is necessary to reference the dev resources as the root is `/src` and there is no public / static
    // resources served with this particular Vite configuration. Modify the proxy rule as necessary for your
    // static resources / project.
    server: {
      port: 30001,
      open: "/game",
      proxy: {
        // Serves static files from main Foundry server.
        [`^(/${s_PACKAGE_ID}/(assets|lang|packs|style.css))`]: "http://localhost:30000",
        // All other paths besides package ID path are served from main Foundry server.
        [`^(?!/${s_PACKAGE_ID}/)`]: "http://localhost:30000",
        // Enable socket.io from main Foundry server.
        "/socket.io": { target: "ws://localhost:30000", ws: true }
      }
    },
    build: {
      outDir: __dirname,
      emptyOutDir: false,
      sourcemap: s_SOURCEMAPS,
      brotliSize: true,
      minify: s_COMPRESS ? "terser" : false,
      target: ["es2022"],
      terserOptions: s_COMPRESS ? { ...terserConfig(), ecma: 2022 } : void 0,
      lib: {
        entry: "./index.js",
        formats: ["es"],
        fileName: "index"
      }
    },
    // Necessary when using the dev server for top-level await usage inside of TRL.
    optimizeDeps: {
      esbuildOptions: {
        target: "es2022"
      }
    },
    plugins: [
      svelte({
        preprocess: preprocess({
          scss: {
            prependData: '@import "src//Styles/Mixins.scss";'
          }
        })
      }),
      resolve(s_RESOLVE_CONFIG)
      // Necessary when bundling npm-linked packages.
    ]
  };
};
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcubWpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcRm91bmRyeVZUVFxcXFxEZXZcXFxcZm91bmRyeXVzZXJkYXRhXFxcXERhdGFcXFxcc3lzdGVtc1xcXFx0aXRhbi1yZWJ1aWxkXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxGb3VuZHJ5VlRUXFxcXERldlxcXFxmb3VuZHJ5dXNlcmRhdGFcXFxcRGF0YVxcXFxzeXN0ZW1zXFxcXHRpdGFuLXJlYnVpbGRcXFxcdml0ZS5jb25maWcubWpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Gb3VuZHJ5VlRUL0Rldi9mb3VuZHJ5dXNlcmRhdGEvRGF0YS9zeXN0ZW1zL3RpdGFuLXJlYnVpbGQvdml0ZS5jb25maWcubWpzXCI7aW1wb3J0IHsgc3ZlbHRlIH0gZnJvbSAnQHN2ZWx0ZWpzL3ZpdGUtcGx1Z2luLXN2ZWx0ZSc7XHJcbmltcG9ydCByZXNvbHZlIGZyb20gJ0Byb2xsdXAvcGx1Z2luLW5vZGUtcmVzb2x2ZSc7IC8vIFRoaXMgcmVzb2x2ZXMgTlBNIG1vZHVsZXMgZnJvbSBub2RlX21vZHVsZXMuXHJcbmltcG9ydCBwcmVwcm9jZXNzIGZyb20gJ3N2ZWx0ZS1wcmVwcm9jZXNzJztcclxuaW1wb3J0IHsgcG9zdGNzc0NvbmZpZywgdGVyc2VyQ29uZmlnIH0gZnJvbSAnQHR5cGhvbmpzLWZ2dHQvcnVudGltZS9yb2xsdXAnO1xyXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCc7XHJcblxyXG5jb25zdCBfX2ZpbGVuYW1lID0gZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpOyAvLyBnZXQgdGhlIHJlc29sdmVkIHBhdGggdG8gdGhlIGZpbGVcclxuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKF9fZmlsZW5hbWUpOyAvLyBnZXQgdGhlIG5hbWUgb2YgdGhlIGRpcmVjdG9yeVxyXG5cclxuLy8gQVRURU5USU9OIVxyXG4vLyBQbGVhc2UgbW9kaWZ5IHRoZSBiZWxvdyB2YXJpYWJsZXM6IHNfUEFDS0FHRV9JRCBhbmQgc19TVkVMVEVfSEFTSF9JRCBhcHByb3ByaWF0ZWx5LlxyXG5cclxuLy8gRm9yIGNvbnZlbmllbmNlLCB5b3UganVzdCBuZWVkIHRvIG1vZGlmeSB0aGUgcGFja2FnZSBJRCBiZWxvdyBhcyBpdCBpcyB1c2VkIHRvIGZpbGwgaW4gZGVmYXVsdCBwcm94eSBzZXR0aW5ncyBmb3JcclxuLy8gdGhlIGRldiBzZXJ2ZXIuXHJcbmNvbnN0IHNfUEFDS0FHRV9JRCA9ICdzeXN0ZW1zL3RpdGFuLXJlYnVpbGQnO1xyXG5cclxuY29uc3Qgc19DT01QUkVTUyA9IGZhbHNlOyAgLy8gU2V0IHRvIHRydWUgdG8gY29tcHJlc3MgdGhlIG1vZHVsZSBidW5kbGUuXHJcbmNvbnN0IHNfU09VUkNFTUFQUyA9IHRydWU7IC8vIEdlbmVyYXRlIHNvdXJjZW1hcHMgZm9yIHRoZSBidW5kbGUgKHJlY29tbWVuZGVkKS5cclxuXHJcbi8vIFVzZWQgaW4gYnVuZGxpbmcgcGFydGljdWxhcmx5IGR1cmluZyBkZXZlbG9wbWVudC4gSWYgeW91IG5wbS1saW5rIHBhY2thZ2VzIHRvIHlvdXIgcHJvamVjdCBhZGQgdGhlbSBoZXJlLlxyXG5jb25zdCBzX1JFU09MVkVfQ09ORklHID0ge1xyXG4gICBicm93c2VyOiB0cnVlLFxyXG4gICBkZWR1cGU6IFsnc3ZlbHRlJ10sXHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCAoKSA9PiB7XHJcbiAgIC8qKiBAdHlwZSB7aW1wb3J0KCd2aXRlJykuVXNlckNvbmZpZ30gKi9cclxuICAgcmV0dXJuIHtcclxuICAgICAgcm9vdDogJ3NyYy8nLCAgICAgICAgICAgICAgICAgLy8gU291cmNlIGxvY2F0aW9uIC8gZXNidWlsZCByb290LlxyXG4gICAgICBiYXNlOiBgLyR7c19QQUNLQUdFX0lEfS9gLCAgICAvLyBCYXNlIG1vZHVsZSBwYXRoIHRoYXQgMzAwMDEgLyBzZXJ2ZWQgZGV2IGRpcmVjdG9yeS5cclxuICAgICAgcHVibGljRGlyOiBmYWxzZSwgICAgICAgICAgICAgLy8gTm8gcHVibGljIHJlc291cmNlcyB0byBjb3B5LlxyXG4gICAgICBjYWNoZURpcjogJy4uLy52aXRlLWNhY2hlJywgICAvLyBSZWxhdGl2ZSBmcm9tIHJvb3QgZGlyZWN0b3J5LlxyXG5cclxuICAgICAgcmVzb2x2ZToge1xyXG4gICAgICAgICBjb25kaXRpb25zOiBbJ2ltcG9ydCcsICdicm93c2VyJ10sXHJcbiAgICAgICAgIGFsaWFzOiB7XHJcbiAgICAgICAgICAgICd+Lyc6IGAke3BhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKX0vYCxcclxuICAgICAgICAgfSxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIGVzYnVpbGQ6IHtcclxuICAgICAgICAgdGFyZ2V0OiBbJ2VzMjAyMiddLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgY3NzOiB7XHJcbiAgICAgICAgIC8vIENyZWF0ZXMgYSBzdGFuZGFyZCBjb25maWd1cmF0aW9uIGZvciBQb3N0Q1NTIHdpdGggYXV0b3ByZWZpeGVyICYgcG9zdGNzcy1wcmVzZXQtZW52LlxyXG4gICAgICAgICBwb3N0Y3NzOiBwb3N0Y3NzQ29uZmlnKHsgY29tcHJlc3M6IHNfQ09NUFJFU1MsIHNvdXJjZU1hcDogc19TT1VSQ0VNQVBTIH0pLFxyXG4gICAgICB9LFxyXG5cclxuICAgICAgZGVmaW5lOiB7XHJcbiAgICAgICAgIHByb2Nlc3M6IHtcclxuICAgICAgICAgICAgZW52OiB7XHJcbiAgICAgICAgICAgICAgIE5PREVfRU5WOiAncHJvZHVjdGlvbicsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgIH0sXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBBYm91dCBzZXJ2ZXIgb3B0aW9uczpcclxuICAgICAgLy8gLSBTZXQgdG8gYG9wZW5gIHRvIGJvb2xlYW4gYGZhbHNlYCB0byBub3Qgb3BlbiBhIGJyb3dzZXIgd2luZG93IGF1dG9tYXRpY2FsbHkuIFRoaXMgaXMgdXNlZnVsIGlmIHlvdSBzZXQgdXAgYVxyXG4gICAgICAvLyBkZWJ1Z2dlciBpbnN0YW5jZSBpbiB5b3VyIElERSBhbmQgbGF1bmNoIGl0IHdpdGggdGhlIFVSTDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMDEvZ2FtZScuXHJcbiAgICAgIC8vXHJcbiAgICAgIC8vIC0gVGhlIHRvcCBwcm94eSBlbnRyeSByZWRpcmVjdHMgcmVxdWVzdHMgdW5kZXIgdGhlIG1vZHVsZSBwYXRoIGZvciBgc3R5bGUuY3NzYCBhbmQgZm9sbG93aW5nIHN0YW5kYXJkIHN0YXRpY1xyXG4gICAgICAvLyBkaXJlY3RvcmllczogYGFzc2V0c2AsIGBsYW5nYCwgYW5kIGBwYWNrc2AgYW5kIHdpbGwgcHVsbCB0aG9zZSByZXNvdXJjZXMgZnJvbSB0aGUgbWFpbiBGb3VuZHJ5IC8gMzAwMDAgc2VydmVyLlxyXG4gICAgICAvLyBUaGlzIGlzIG5lY2Vzc2FyeSB0byByZWZlcmVuY2UgdGhlIGRldiByZXNvdXJjZXMgYXMgdGhlIHJvb3QgaXMgYC9zcmNgIGFuZCB0aGVyZSBpcyBubyBwdWJsaWMgLyBzdGF0aWNcclxuICAgICAgLy8gcmVzb3VyY2VzIHNlcnZlZCB3aXRoIHRoaXMgcGFydGljdWxhciBWaXRlIGNvbmZpZ3VyYXRpb24uIE1vZGlmeSB0aGUgcHJveHkgcnVsZSBhcyBuZWNlc3NhcnkgZm9yIHlvdXJcclxuICAgICAgLy8gc3RhdGljIHJlc291cmNlcyAvIHByb2plY3QuXHJcbiAgICAgIHNlcnZlcjoge1xyXG4gICAgICAgICBwb3J0OiAzMDAwMSxcclxuICAgICAgICAgb3BlbjogJy9nYW1lJyxcclxuICAgICAgICAgcHJveHk6IHtcclxuICAgICAgICAgICAgLy8gU2VydmVzIHN0YXRpYyBmaWxlcyBmcm9tIG1haW4gRm91bmRyeSBzZXJ2ZXIuXHJcbiAgICAgICAgICAgIFtgXigvJHtzX1BBQ0tBR0VfSUR9Lyhhc3NldHN8bGFuZ3xwYWNrc3xzdHlsZS5jc3MpKWBdOiAnaHR0cDovL2xvY2FsaG9zdDozMDAwMCcsXHJcblxyXG4gICAgICAgICAgICAvLyBBbGwgb3RoZXIgcGF0aHMgYmVzaWRlcyBwYWNrYWdlIElEIHBhdGggYXJlIHNlcnZlZCBmcm9tIG1haW4gRm91bmRyeSBzZXJ2ZXIuXHJcbiAgICAgICAgICAgIFtgXig/IS8ke3NfUEFDS0FHRV9JRH0vKWBdOiAnaHR0cDovL2xvY2FsaG9zdDozMDAwMCcsXHJcblxyXG4gICAgICAgICAgICAvLyBFbmFibGUgc29ja2V0LmlvIGZyb20gbWFpbiBGb3VuZHJ5IHNlcnZlci5cclxuICAgICAgICAgICAgJy9zb2NrZXQuaW8nOiB7IHRhcmdldDogJ3dzOi8vbG9jYWxob3N0OjMwMDAwJywgd3M6IHRydWUgfSxcclxuICAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgICAgYnVpbGQ6IHtcclxuICAgICAgICAgb3V0RGlyOiBfX2Rpcm5hbWUsXHJcbiAgICAgICAgIGVtcHR5T3V0RGlyOiBmYWxzZSxcclxuICAgICAgICAgc291cmNlbWFwOiBzX1NPVVJDRU1BUFMsXHJcbiAgICAgICAgIGJyb3RsaVNpemU6IHRydWUsXHJcbiAgICAgICAgIG1pbmlmeTogc19DT01QUkVTUyA/ICd0ZXJzZXInIDogZmFsc2UsXHJcbiAgICAgICAgIHRhcmdldDogWydlczIwMjInXSxcclxuICAgICAgICAgdGVyc2VyT3B0aW9uczogc19DT01QUkVTUyA/IHsgLi4udGVyc2VyQ29uZmlnKCksIGVjbWE6IDIwMjIgfSA6IHZvaWQgMCxcclxuICAgICAgICAgbGliOiB7XHJcbiAgICAgICAgICAgIGVudHJ5OiAnLi9pbmRleC5qcycsXHJcbiAgICAgICAgICAgIGZvcm1hdHM6IFsnZXMnXSxcclxuICAgICAgICAgICAgZmlsZU5hbWU6ICdpbmRleCcsXHJcbiAgICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgIC8vIE5lY2Vzc2FyeSB3aGVuIHVzaW5nIHRoZSBkZXYgc2VydmVyIGZvciB0b3AtbGV2ZWwgYXdhaXQgdXNhZ2UgaW5zaWRlIG9mIFRSTC5cclxuICAgICAgb3B0aW1pemVEZXBzOiB7XHJcbiAgICAgICAgIGVzYnVpbGRPcHRpb25zOiB7XHJcbiAgICAgICAgICAgIHRhcmdldDogJ2VzMjAyMicsXHJcbiAgICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgIHBsdWdpbnM6IFtcclxuICAgICAgICAgc3ZlbHRlKHtcclxuICAgICAgICAgICAgcHJlcHJvY2VzczogcHJlcHJvY2Vzcyh7XHJcbiAgICAgICAgICAgICAgIHNjc3M6IHtcclxuICAgICAgICAgICAgICAgICAgcHJlcGVuZERhdGE6ICdAaW1wb3J0IFwic3JjLy9TdHlsZXMvTWl4aW5zLnNjc3NcIjsnLFxyXG4gICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgfSksXHJcblxyXG4gICAgICAgICByZXNvbHZlKHNfUkVTT0xWRV9DT05GSUcpLCAgICAvLyBOZWNlc3Nhcnkgd2hlbiBidW5kbGluZyBucG0tbGlua2VkIHBhY2thZ2VzLlxyXG4gICAgICBdLFxyXG4gICB9O1xyXG59O1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXNYLFNBQVMsY0FBYztBQUM3WSxPQUFPLGFBQWE7QUFDcEIsT0FBTyxnQkFBZ0I7QUFDdkIsU0FBUyxlQUFlLG9CQUFvQjtBQUM1QyxPQUFPLFVBQVU7QUFDakIsU0FBUyxxQkFBcUI7QUFMZ04sSUFBTSwyQ0FBMkM7QUFPL1IsSUFBTSxhQUFhLGNBQWMsd0NBQWU7QUFDaEQsSUFBTSxZQUFZLEtBQUssUUFBUSxVQUFVO0FBT3pDLElBQU0sZUFBZTtBQUVyQixJQUFNLGFBQWE7QUFDbkIsSUFBTSxlQUFlO0FBR3JCLElBQU0sbUJBQW1CO0FBQUEsRUFDdEIsU0FBUztBQUFBLEVBQ1QsUUFBUSxDQUFDLFFBQVE7QUFDcEI7QUFFQSxJQUFPLHNCQUFRLE1BQU07QUFFbEIsU0FBTztBQUFBLElBQ0osTUFBTTtBQUFBO0FBQUEsSUFDTixNQUFNLElBQUksWUFBWTtBQUFBO0FBQUEsSUFDdEIsV0FBVztBQUFBO0FBQUEsSUFDWCxVQUFVO0FBQUE7QUFBQSxJQUVWLFNBQVM7QUFBQSxNQUNOLFlBQVksQ0FBQyxVQUFVLFNBQVM7QUFBQSxNQUNoQyxPQUFPO0FBQUEsUUFDSixNQUFNLEdBQUcsS0FBSyxRQUFRLFdBQVcsS0FBSyxDQUFDO0FBQUEsTUFDMUM7QUFBQSxJQUNIO0FBQUEsSUFFQSxTQUFTO0FBQUEsTUFDTixRQUFRLENBQUMsUUFBUTtBQUFBLElBQ3BCO0FBQUEsSUFFQSxLQUFLO0FBQUE7QUFBQSxNQUVGLFNBQVMsY0FBYyxFQUFFLFVBQVUsWUFBWSxXQUFXLGFBQWEsQ0FBQztBQUFBLElBQzNFO0FBQUEsSUFFQSxRQUFRO0FBQUEsTUFDTCxTQUFTO0FBQUEsUUFDTixLQUFLO0FBQUEsVUFDRixVQUFVO0FBQUEsUUFDYjtBQUFBLE1BQ0g7QUFBQSxJQUNIO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFXQSxRQUFRO0FBQUEsTUFDTCxNQUFNO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUE7QUFBQSxRQUVKLENBQUMsTUFBTSxZQUFZLGlDQUFpQyxHQUFHO0FBQUE7QUFBQSxRQUd2RCxDQUFDLFFBQVEsWUFBWSxJQUFJLEdBQUc7QUFBQTtBQUFBLFFBRzVCLGNBQWMsRUFBRSxRQUFRLHdCQUF3QixJQUFJLEtBQUs7QUFBQSxNQUM1RDtBQUFBLElBQ0g7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNKLFFBQVE7QUFBQSxNQUNSLGFBQWE7QUFBQSxNQUNiLFdBQVc7QUFBQSxNQUNYLFlBQVk7QUFBQSxNQUNaLFFBQVEsYUFBYSxXQUFXO0FBQUEsTUFDaEMsUUFBUSxDQUFDLFFBQVE7QUFBQSxNQUNqQixlQUFlLGFBQWEsRUFBRSxHQUFHLGFBQWEsR0FBRyxNQUFNLEtBQUssSUFBSTtBQUFBLE1BQ2hFLEtBQUs7QUFBQSxRQUNGLE9BQU87QUFBQSxRQUNQLFNBQVMsQ0FBQyxJQUFJO0FBQUEsUUFDZCxVQUFVO0FBQUEsTUFDYjtBQUFBLElBQ0g7QUFBQTtBQUFBLElBRUEsY0FBYztBQUFBLE1BQ1gsZ0JBQWdCO0FBQUEsUUFDYixRQUFRO0FBQUEsTUFDWDtBQUFBLElBQ0g7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNOLE9BQU87QUFBQSxRQUNKLFlBQVksV0FBVztBQUFBLFVBQ3BCLE1BQU07QUFBQSxZQUNILGFBQWE7QUFBQSxVQUNoQjtBQUFBLFFBQ0gsQ0FBQztBQUFBLE1BQ0osQ0FBQztBQUFBLE1BRUQsUUFBUSxnQkFBZ0I7QUFBQTtBQUFBLElBQzNCO0FBQUEsRUFDSDtBQUNIOyIsCiAgIm5hbWVzIjogW10KfQo=
