// @vitest-environment node

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoFile = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("phase 1 local dev contract", () => {
  it("keeps the expected npm scripts for the Netlify and Supabase bridge", () => {
    const packageJson = JSON.parse(repoFile("package.json")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts.dev).toBe("vite");
    expect(packageJson.scripts.build).toBe("tsc -b && vite build");
    expect(packageJson.scripts["dev:trpc"]).toBe("bash scripts/dev/serve-trpc-local.sh");
  });

  it("keeps Netlify pointed at Vite and the local Supabase API ports", () => {
    const netlifyToml = repoFile("netlify.toml");

    expect(netlifyToml).toContain('port = 8888');
    expect(netlifyToml).toContain('targetPort = 5173');
    expect(netlifyToml).toContain('from = "/functions/v1/*"');
    expect(netlifyToml).toContain('to = "http://127.0.0.1:54331/functions/v1/:splat"');
    expect(netlifyToml).toContain('from = "/rest/v1/*"');
    expect(netlifyToml).toContain('to = "http://127.0.0.1:54331/rest/v1/:splat"');
    expect(netlifyToml).toContain('from = "/auth/v1/*"');
    expect(netlifyToml).toContain('to = "http://127.0.0.1:54331/auth/v1/:splat"');
    expect(netlifyToml.match(/force = true/g)).toHaveLength(3);
  });

  it("serves the local tRPC function with the checked-in env file", () => {
    const serveScript = repoFile("scripts/dev/serve-trpc-local.sh");

    expect(serveScript).toContain("supabase functions serve trpc");
    expect(serveScript).toContain("--env-file supabase/functions/.env");
    expect(serveScript).toContain("--no-verify-jwt");
  });
});
