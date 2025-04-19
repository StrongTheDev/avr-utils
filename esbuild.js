require("esbuild")
  .build({
    entryPoints: ["src/extension.js"],
    bundle: true,
    platform: "node",
    target: "node18",
    outdir: "dist",
    external: ["vscode"],
  })
  .catch(() => process.exit(1));
