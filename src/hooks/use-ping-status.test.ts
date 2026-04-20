import { describe, expect, it } from "vitest";

import { TRPC_ENDPOINT } from "../lib/trpc/client";
import { toPingStatus } from "./use-ping-status";

describe("use-ping-status module", () => {
  it("keeps the tRPC client on the Netlify proxy path", () => {
    expect(TRPC_ENDPOINT).toBe("/functions/v1/trpc");
  });

  it("maps a successful ping into a connected status", () => {
    const status = toPingStatus({
      data: {
        pong: true,
        ts: Date.UTC(2026, 3, 19, 12, 30, 0),
      },
    });

    expect(status.connected).toBe(true);
    expect(status.error).toBeNull();
    expect(status.updatedAt).not.toBeNull();
  });

  it("maps a failed ping into an error state", () => {
    const status = toPingStatus({
      error: new Error("network down"),
    });

    expect(status.connected).toBe(false);
    expect(status.error).toBe("network down");
    expect(status.updatedAt).toBeNull();
  });
});
