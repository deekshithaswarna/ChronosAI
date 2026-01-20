import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { extractText } from './documentExtractor';
import { extractFactsFromText } from './factExtractor';
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import axios from "axios";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  documents: router({
    // Upload document and trigger processing
    upload: protectedProcedure
      .input(z.object({
        filename: z.string(),
        mimeType: z.string(),
        fileSize: z.number(),
        base64Data: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        
        // Convert base64 to buffer
        const fileBuffer = Buffer.from(input.base64Data, 'base64');
        
        // Upload to S3
        const fileKey = `${userId}/documents/${nanoid()}-${input.filename}`;
        const { url: s3Url } = await storagePut(fileKey, fileBuffer, input.mimeType);
        
        // Create document record
        const documentId = await db.createDocument({
          userId,
          filename: input.filename,
          originalFilename: input.filename,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          s3Key: fileKey,
          s3Url,
          status: "pending",
        });
        
        // Trigger async processing (don't await)
        processDocumentAsync(documentId, s3Url, input.mimeType).catch(err => {
          console.error(`Failed to process document ${documentId}:`, err);
        });
        
        return { documentId, s3Url };
      }),

    // List user's documents
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserDocuments(ctx.user.id);
    }),

    // Get single document with facts
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const document = await db.getDocumentById(input.id);
        if (!document || document.userId !== ctx.user.id) {
          throw new Error("Document not found");
        }
        
        const documentFacts = await db.getDocumentFacts(input.id);
        
        return {
          document,
          facts: documentFacts,
        };
      }),

    // Delete document
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteDocument(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  facts: router({
    // List all user's facts
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserFacts(ctx.user.id);
    }),

    // Get facts with optional filters
    filter: protectedProcedure
      .input(z.object({
        actor: z.string().optional(),
        issue: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const allFacts = await db.getUserFacts(ctx.user.id);
        
        let filtered = allFacts;
        if (input.actor) {
          filtered = filtered.filter(f => f.actor === input.actor);
        }
        if (input.issue) {
          filtered = filtered.filter(f => f.issue === input.issue);
        }
        
        return filtered;
      }),
  }),

  actors: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserActors(ctx.user.id);
    }),
  }),

  issues: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserIssues(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;

// Async document processing function
async function processDocumentAsync(documentId: number, s3Url: string, mimeType: string) {
  try {
    await db.updateDocumentStatus(documentId, "processing");
    
    // Download file from S3
    const response = await axios.get(s3Url, { responseType: 'arraybuffer' });
    const fileBuffer = Buffer.from(response.data);
    
    // Extract text using Node.js
    const extractedText = await extractText(fileBuffer, mimeType);
    
    // Extract facts using LLM
    const facts = await extractFactsFromText(extractedText);
    
    // Get document to get userId
    const document = await db.getDocumentById(documentId);
    if (!document) throw new Error("Document not found");
    
    // Save facts to database with new schema
    for (const fact of facts) {
      await db.createFact({
        documentId,
        userId: document.userId,
        eventDate: new Date(fact.date),
        originalDateText: fact.date + (fact.time ? ` ${fact.time}` : ''),
        summary: fact.event,
        fullText: fact.originalText,
        actor: fact.actor,
        issue: null, // No longer extracted separately
        citation: fact.citation || null,
        confidence: fact.importance * 10, // Convert 1-10 to 10-100
      });
    }
    
    // Update document status
    await db.updateDocumentStatus(documentId, "completed", undefined, extractedText);
    
  } catch (error) {
    console.error(`Document processing failed for ${documentId}:`, error);
    await db.updateDocumentStatus(documentId, "failed", String(error));
  }
}

