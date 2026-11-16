import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = JSON.parse(readFileSync("firebase.json", "utf8"));
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

describe("Firebase Hosting deployment", () => {
  it("serves the compiled app rather than the source public folder", () => {
    expect(config.hosting.public).toBe("dist");
  });

  it("builds the app before upload", () => {
    expect(config.hosting.predeploy).toContain("npm run build");
    expect(pkg.scripts.build).toBe("vite build");
  });

  it("loads the app for client-side deep links", () => {
    expect(config.hosting.rewrites).toContainEqual({
      source: "**",
      destination: "/index.html",
    });
  });
});