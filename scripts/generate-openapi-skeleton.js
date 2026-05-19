const fs = require("fs");
const path = require("path");

const workspaceRoot = path.resolve(__dirname, "..");
const appJs = path.join(workspaceRoot, "src", "app.js");
const routesDir = path.join(workspaceRoot, "src", "routes");
const outFile = path.join(workspaceRoot, "support", "docs", "openapi-skeleton.yml");

function readAppMappings() {
  const content = fs.readFileSync(appJs, "utf8");
  const varRegex = /const\s+(\w+)\s*=\s*require\(['"]\.(\/routes\/[\w\/-]+)['"]\);/g;
  const useRegex = /app\.use\(['"]([^'"']+)['"'],\s*(\w+)\)/g;
  const varMap = {}; // varName -> routeFile
  let m;
  while ((m = varRegex.exec(content))) {
    varMap[m[1]] = m[2];
  }
  const mountMap = {}; // mountPath -> routeFile
  while ((m = useRegex.exec(content))) {
    const mount = m[1];
    const varName = m[2];
    if (varMap[varName]) {
      mountMap[mount] = path.join(workspaceRoot, "src", varMap[varName] + ".js");
    }
  }
  return mountMap;
}

function scanRouteFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf8");
  const regex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  const results = [];
  let m;
  while ((m = regex.exec(content))) {
    results.push({ method: m[1].toLowerCase(), route: m[2] });
  }
  return results;
}

function pathJoin(a, b) {
  if (!a) return b;
  if (!b) return a;
  return (a.replace(/\/$/, "") + "/" + b.replace(/^\//, "")).replace(/\\/g, "/");
}

function paramize(route) {
  // convert :id to {id}
  return route.replace(/:([a-zA-Z0-9_]+)/g, "{$1}");
}

function extractParams(route) {
  const params = [];
  const re = /:([a-zA-Z0-9_]+)/g;
  let m;
  while ((m = re.exec(route))) {
    params.push(m[1]);
  }
  return params;
}

function buildSkeleton() {
  const mounts = readAppMappings();
  const paths = {};

  Object.entries(mounts).forEach(([mount, filePath]) => {
    if (!fs.existsSync(filePath)) return;
    const routeDefs = scanRouteFile(filePath);
    routeDefs.forEach((def) => {
      const combined = pathJoin(mount, def.route);
      const openapiPath = paramize(combined);
      if (!paths[openapiPath]) paths[openapiPath] = {};
      const params = extractParams(def.route).map((name) => ({
        name,
        in: "path",
        required: true,
        schema: { type: "string" },
      }));
      paths[openapiPath][def.method] = {
        summary: "AUTO: " + def.method.toUpperCase() + " " + openapiPath,
        tags: [mount.replace(/^\//, "").split("/")[1] || mount.replace(/^\//, "").split("/")[0]],
        parameters: params.length ? params : undefined,
        responses: { 200: { description: "OK" } },
      };
    });
  });

  // produce YAML
  let yaml = "";
  yaml +=
    "openapi: 3.0.0\ninfo:\n  title: Startup Connect API (skeleton)\n  version: 1.0.0\npaths:\n";
  Object.entries(paths).forEach(([p, methods]) => {
    yaml += `  ${p}:\n`;
    Object.entries(methods).forEach(([m, body]) => {
      yaml += `    ${m}:\n`;
      yaml += `      summary: "${body.summary}"\n`;
      if (body.tags) yaml += `      tags:\n        - ${body.tags[0]}\n`;
      if (body.parameters) {
        yaml += "      parameters:\n";
        body.parameters.forEach((param) => {
          yaml += `        - name: ${param.name}\n          in: ${param.in}\n          required: true\n          schema:\n            type: ${param.schema.type}\n`;
        });
      }
      yaml += '      responses:\n        "200":\n          description: OK\n';
    });
  });

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, yaml, "utf8");
  console.log("Wrote skeleton to", outFile);
}

buildSkeleton();
