/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "packages-must-not-depend-on-apps",
      severity: "error",
      comment:
        "Clean Architecture: shared packages are inner layers, apps are outer. Never import upwards; invert with ports.",
      from: { path: "packages/(config|navigation|ui)/src" },
      to: { path: "apps/" },
    },
    {
      name: "config-must-stay-lowest-layer",
      severity: "error",
      comment: "config is the lowest layer: it must not import ui or navigation.",
      from: { path: "packages/config/src" },
      to: { path: "packages/(ui|navigation)/src" },
    },
    {
      name: "client-never-imports-server-entry",
      severity: "error",
      comment:
        "Client code (apps, shared UI) may only use the client-safe api entry (@aqui-suena/api/client). Importing the api root evaluates initTRPC.create() in browsers and React Native, which throws. apps/api is the server and is the one place allowed to import the router.",
      from: { path: "(apps/[^/]+/(app|src)|packages/ui/src)", pathNot: "apps/api/src" },
      to: {
        path: "packages/api/src",
        pathNot: "packages/api/src/(client|listener)\\.ts$",
      },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: "node_modules|\\.next|\\.turbo|\\.expo|/dist/|/build/",
    tsConfig: { fileName: "tsconfig.base.json" },
  },
};
