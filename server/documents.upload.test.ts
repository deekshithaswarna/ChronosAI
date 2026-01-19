import { describe, expect, it, vi, beforeEach } from "vitest";
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

describe("documents.upload", () => {
  it("should accept valid PDF upload", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a simple base64 encoded test string (simulating a small PDF)
    const testContent = "Test PDF content";
    const base64Data = Buffer.from(testContent).toString('base64');

    const result = await caller.documents.upload({
      filename: "test-document.pdf",
      mimeType: "application/pdf",
      fileSize: testContent.length,
      base64Data,
    });

    expect(result).toHaveProperty('documentId');
    expect(result).toHaveProperty('s3Url');
    expect(typeof result.documentId).toBe('number');
    expect(typeof result.s3Url).toBe('string');
    expect(result.s3Url).toContain('http');
  });

  it("should accept DOCX upload", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const testContent = "Test DOCX content";
    const base64Data = Buffer.from(testContent).toString('base64');

    const result = await caller.documents.upload({
      filename: "test-document.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileSize: testContent.length,
      base64Data,
    });

    expect(result).toHaveProperty('documentId');
    expect(result).toHaveProperty('s3Url');
  });

  it("should accept plain text upload", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const testContent = "Test plain text content";
    const base64Data = Buffer.from(testContent).toString('base64');

    const result = await caller.documents.upload({
      filename: "test-document.txt",
      mimeType: "text/plain",
      fileSize: testContent.length,
      base64Data,
    });

    expect(result).toHaveProperty('documentId');
    expect(result).toHaveProperty('s3Url');
  });
});
