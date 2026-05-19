const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const root = path.resolve(__dirname, "..");
const baseFile = path.join(root, "support", "docs", "openapi.yml");
const skeletonFile = path.join(root, "support", "docs", "openapi-skeleton.yml");
const outFile = path.join(root, "support", "docs", "openapi-merged.yml");

function loadYaml(file) {
  if (!fs.existsSync(file)) return {};
  return yaml.load(fs.readFileSync(file, "utf8")) || {};
}

const base = loadYaml(baseFile);
const skel = loadYaml(skeletonFile);

base.paths = base.paths || {};
skel.paths = skel.paths || {};

Object.entries(skel.paths).forEach(([p, methods]) => {
  if (!base.paths[p]) base.paths[p] = methods;
  else {
    Object.entries(methods).forEach(([m, body]) => {
      if (!base.paths[p][m]) base.paths[p][m] = body;
    });
  }
});

const outYaml = yaml.dump(base, { noRefs: true, lineWidth: 120 });
fs.writeFileSync(outFile, outYaml, "utf8");
console.log("Wrote merged OpenAPI to", outFile);
