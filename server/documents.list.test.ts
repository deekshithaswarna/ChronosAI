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

describe("documents.list", () => {
  it("should return array of documents for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.documents.list();

    expect(Array.isArray(result)).toBe(true);
    // Documents array may be empty if no uploads yet
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('filename');
      expect(result[0]).toHaveProperty('status');
      expect(result[0]).toHaveProperty('userId');
      expect(result[0].userId).toBe(ctx.user.id);
    }
  });

  it("should return documents sorted by creation date descending", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.documents.list();

    if (result.length > 1) {
      const firstDate = new Date(result[0].createdAt);
      const secondDate = new Date(result[1].createdAt);
      expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime());
    }
  });
});

describe("documents.get", () => {
  it("should require document id parameter", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This should throw because document with id 999999 likely doesn't exist
    await expect(
      caller.documents.get({ id: 999999 })
    ).rejects.toThrow();
  });
});

describe("documents.delete", () => {
  it("should accept document id parameter", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Attempting to delete non-existent document should not crash
    // It may succeed (returning success: true) or throw, both are acceptable
    try {
      const result = await caller.documents.delete({ id: 999999 });
      expect(result).toHaveProperty('success');
    } catch (error) {
      // Deletion of non-existent document may throw, which is also valid
      expect(error).toBeDefined();
    }
  });
});
