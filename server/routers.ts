import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { extractText } from './documentExtractor';
import { reconcileUserActors } from './actorReconciler';
import { extractFactsFromText } from './factExtractor';
import { generateCaseSummary } from './caseSummary';
import { evaluateMateriality } from './materiality';
import { generateDramatisPersonae } from './dramatisPersonae';
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
        
        // Use the filename as the initial title. The descriptive document title
        // is produced by the main extraction pass (processDocumentAsync below),
        // so we skip a separate per-upload LLM call here to conserve API quota.
        const documentId = await db.createDocument({
          userId,
          filename: input.filename,
          originalFilename: input.filename,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          s3Key: fileKey,
          s3Url,
          status: "pending",
          documentTitle: input.filename,
        });
        
        // Trigger async processing (don't await)
        processDocumentAsync(documentId, s3Url, input.mimeType, input.filename).catch(err => {
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
    
    // Update document title
    updateTitle: protectedProcedure
      .input(z.object({ 
        id: z.number(),
        title: z.string()
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateDocumentTitle(input.id, ctx.user.id, input.title);
        return { success: true };
      }),
  }),

  facts: router({
    // List all user's facts
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserFacts(ctx.user.id);
    }),

    // Reconcile actor name variants (same person written different ways) across
    // all of the user's facts. Runs automatically after each upload too.
    reconcileActors: protectedProcedure.mutation(async ({ ctx }) => {
      await reconcileUserActors(ctx.user.id);
      return { success: true };
    }),

    // Re-score every fact's materiality against the current Case Memory.
    reEvaluateKeyFacts: protectedProcedure.mutation(async ({ ctx }) => {
      return evaluateMateriality(ctx.user.id);
    }),

    // User override for whether a fact is "key". Pass null to revert to the AI decision.
    setKey: protectedProcedure
      .input(z.object({ id: z.number(), isKey: z.boolean().nullable() }))
      .mutation(async ({ ctx, input }) => {
        await db.setFactKeyOverride(input.id, ctx.user.id, input.isKey);
        return { success: true };
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

    // Update fact (for user-editable fields)
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        userIssues: z.array(z.string()).optional(),
        comments: z.string().optional(),
        summary: z.string().optional(),
        eventDate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateFact(input.id, {
          userIssues: input.userIssues,
          comments: input.comments,
          summary: input.summary,
          eventDate: input.eventDate ? new Date(input.eventDate) : undefined,
        });
        return { success: true };
      }),

    // Rename person across all facts (merge duplicates)
    renamePerson: protectedProcedure
      .input(z.object({
        oldName: z.string(),
        newName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.renamePersonInFacts(ctx.user.id, input.oldName, input.newName);
        return { success: true };
      }),

    // Delete fact
    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteFact(input.id, ctx.user.id);
        return { success: true };
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

  caseMemory: router({
    // Current case memory for the user (null if none yet).
    get: protectedProcedure.query(async ({ ctx }) => {
      return (await db.getCaseMemory(ctx.user.id)) ?? null;
    }),

    // (Re)generate the case summary from the user's facts via the LLM.
    generate: protectedProcedure.mutation(async ({ ctx }) => {
      const result = await generateCaseSummary(ctx.user.id);
      return result ?? null;
    }),

    // Save user edits (or a pasted/own summary). Marks the source accordingly.
    update: protectedProcedure
      .input(z.object({
        title: z.string().optional(),
        summary: z.string(),
        parties: z.array(z.string()).optional(),
        issues: z.array(z.string()).optional(),
        source: z.enum(["ai", "user", "uploaded"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return (await db.upsertCaseMemory(ctx.user.id, {
          title: input.title,
          summary: input.summary,
          parties: input.parties,
          issues: input.issues,
          source: input.source ?? "user",
        })) ?? null;
      }),
  }),

  dramatisPersonae: router({
    // Cast of parties, each with the documents/pages that reference them
    // (references are derived live from facts so they stay current).
    get: protectedProcedure.query(async ({ ctx }) => {
      const [people, facts] = await Promise.all([
        db.getDramatisPersonae(ctx.user.id),
        db.getUserFacts(ctx.user.id),
      ]);

      const norm = (s: string) => s.trim().toLowerCase();

      return people.map(person => {
        // Find documents + page numbers where this person is an actor.
        const byDoc = new Map<number, { documentId: number; documentTitle: string | null; documentName: string | null; documentUrl: string | null; pages: Set<number> }>();
        for (const f of facts) {
          if (!f.actor) continue;
          const names = f.actor.split(/[,;]/).map(a => norm(a));
          if (!names.includes(norm(person.name))) continue;
          const docId = f.documentId;
          if (!byDoc.has(docId)) {
            byDoc.set(docId, {
              documentId: docId,
              documentTitle: f.documentTitle ?? null,
              documentName: f.documentName ?? null,
              documentUrl: f.documentUrl ?? null,
              pages: new Set<number>(),
            });
          }
          if (f.pageNumber) byDoc.get(docId)!.pages.add(f.pageNumber);
        }

        const references = [...byDoc.values()].map(r => ({
          documentId: r.documentId,
          documentTitle: r.documentTitle,
          documentName: r.documentName,
          documentUrl: r.documentUrl,
          pages: [...r.pages].sort((a, b) => a - b),
        }));

        return {
          id: person.id,
          name: person.name,
          role: person.role,
          narrative: person.narrative,
          references,
        };
      });
    }),

    // (Re)generate the cast from the user's facts via the LLM.
    generate: protectedProcedure.mutation(async ({ ctx }) => {
      await generateDramatisPersonae(ctx.user.id);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;

// Extract Smart Title from first 2 pages using LLM
async function extractSmartTitle(firstPagesText: string): Promise<string> {
  try {
    console.log('[extractSmartTitle] Function called with text length:', firstPagesText.length);
    const { invokeLLM } = await import('./_core/llm');
    console.log('[extractSmartTitle] invokeLLM imported successfully');
    
    console.log('[extractSmartTitle] Calling LLM...');
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are a legal document analyzer. Extract the formal legal title of the document from the provided text. Return ONLY the title, nothing else. Examples: "Witness Statement of John Doe", "Arbitration Award in Case No. 12345", "Expert Report by Dr. Jane Smith"'
        },
        {
          role: 'user',
          content: `Extract the formal legal title from this document:\n\n${firstPagesText.substring(0, 3000)}`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'document_title',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'The formal legal title of the document'
              }
            },
            required: ['title'],
            additionalProperties: false
          }
        }
      }
    });
    
    console.log('[extractSmartTitle] LLM response received:', JSON.stringify(response, null, 2));
    const content = response.choices[0]?.message?.content;
    console.log('[extractSmartTitle] Content:', content);
    if (content && typeof content === 'string') {
      const parsed = JSON.parse(content);
      console.log('[extractSmartTitle] Parsed:', parsed);
      const title = parsed.title || 'Untitled Document';
      console.log('[extractSmartTitle] Final title:', title);
      return title;
    }
    
    console.log('[extractSmartTitle] No valid content, returning Untitled Document');
    return 'Untitled Document';
  } catch (error) {
    console.error('[extractSmartTitle] ERROR:', error);
    console.error('[extractSmartTitle] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return 'Untitled Document';
  }
}

// Async document processing function
async function processDocumentAsync(documentId: number, s3Url: string, mimeType: string, filename: string) {
  try {
    await db.updateDocumentStatus(documentId, "processing");

    // Download file: local-disk storage returns a relative /uploads/ path
    // (read straight from disk); remote storage returns an absolute URL.
    let fileBuffer: Buffer;
    if (s3Url.startsWith("/uploads/")) {
      const { promises: fs } = await import("fs");
      const path = await import("path");
      const rel = s3Url.replace(/^\/uploads\//, "");
      fileBuffer = await fs.readFile(path.join(process.cwd(), "uploads", rel));
    } else {
      const response = await axios.get(s3Url, { responseType: 'arraybuffer' });
      fileBuffer = Buffer.from(response.data);
    }

    // Extract text using Node.js
    const extractedData = await extractText(fileBuffer, mimeType);
    
    // Extract facts using LLM (returns ExtractionResult with documentTitle and facts)
    const extractionResult = await extractFactsFromText(extractedData.text, extractedData.pages, filename);
    
    // Get document to get userId
    const document = await db.getDocumentById(documentId);
    if (!document) throw new Error("Document not found");
    
    // Save facts to database with new schema
    for (const fact of extractionResult.facts) {
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
        pageNumber: fact.pageNumber || null,
      });
    }
    
    // Update document status and save document title
    await db.updateDocumentWithTitle(documentId, extractionResult.documentTitle, extractedData.text);
    await db.updateDocumentStatus(documentId, "completed");

    // Reconcile actor names across all of this user's facts so the same person
    // written different ways (e.g. "Priya" / "Priya Sharma" / "Sharma, Priya")
    // collapses to one canonical name. Best-effort; never fails the upload.
    await reconcileUserActors(document.userId);

  } catch (error) {
    console.error(`Document processing failed for ${documentId}:`, error);
    await db.updateDocumentStatus(documentId, "failed", String(error));
  }
}

