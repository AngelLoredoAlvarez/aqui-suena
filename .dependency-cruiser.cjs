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
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: "node_modules|\\.next|\\.turbo|\\.expo|/dist/|/build/",
    tsConfig: { fileName: "tsconfig.base.json" },
  },
};
