import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("facts.list", () => {
  it("should return array of facts for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.facts.list();

    expect(Array.isArray(result)).toBe(true);
    // Facts array may be empty if no documents have been processed yet
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('eventDate');
      expect(result[0]).toHaveProperty('summary');
    }
  });
});

describe("facts.filter", () => {
  it("should accept actor filter parameter", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.facts.filter({
      actor: "John Doe",
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("should accept issue filter parameter", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.facts.filter({
      issue: "Contract Dispute",
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("should accept both actor and issue filters", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.facts.filter({
      actor: "John Doe",
      issue: "Contract Dispute",
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("should work without filters", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.facts.filter({});

    expect(Array.isArray(result)).toBe(true);
  });
});
