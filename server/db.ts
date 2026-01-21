import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, documents, facts, actors, issues, InsertDocument, InsertFact, InsertActor, InsertIssue } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Document queries
export async function createDocument(doc: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(documents).values(doc);
  return result[0].insertId;
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserDocuments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.createdAt));
}

export async function updateDocumentStatus(id: number, status: "pending" | "processing" | "completed" | "failed", errorMessage?: string, extractedText?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(documents)
    .set({ 
      status, 
      errorMessage: errorMessage || null,
      extractedText: extractedText || null,
      updatedAt: new Date()
    })
    .where(eq(documents.id, id));
}

export async function updateDocumentWithTitle(id: number, documentTitle: string, extractedText?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(documents)
    .set({ 
      documentTitle,
      extractedText: extractedText || null,
      updatedAt: new Date()
    })
    .where(eq(documents.id, id));
}

// Fact queries
export async function createFact(fact: InsertFact) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(facts).values(fact);
  return result[0].insertId;
}

export async function getUserFacts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Join with documents table to get document name, title, and URL
  const result = await db
    .select({
      id: facts.id,
      documentId: facts.documentId,
      userId: facts.userId,
      eventDate: facts.eventDate,
      originalDateText: facts.originalDateText,
      summary: facts.summary,
      fullText: facts.fullText,
      actor: facts.actor,
      issue: facts.issue,
      userIssues: facts.userIssues,
      citation: facts.citation,
      comments: facts.comments,
      confidence: facts.confidence,
      createdAt: facts.createdAt,
      updatedAt: facts.updatedAt,
      documentName: documents.filename,
      documentTitle: documents.documentTitle,
      documentUrl: documents.s3Url,
    })
    .from(facts)
    .leftJoin(documents, eq(facts.documentId, documents.id))
    .where(eq(facts.userId, userId))
    .orderBy(facts.eventDate);
  
  return result;
}

export async function getDocumentFacts(documentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(facts).where(eq(facts.documentId, documentId)).orderBy(facts.eventDate);
}
export async function updateFact(id: number, updates: { userIssues?: string[]; comments?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(facts)
    .set({ 
      userIssues: updates.userIssues,
      comments: updates.comments,
      updatedAt: new Date()
    })
    .where(eq(facts.id, id));
}

export async function deleteDocument(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete associated facts first
  await db.delete(facts).where(eq(facts.documentId, id));
  
  // Delete document
  await db.delete(documents).where(and(eq(documents.id, id), eq(documents.userId, userId)));
}

// Actor queries
export async function getUserActors(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(actors).where(eq(actors.userId, userId));
}

export async function createActor(actor: InsertActor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(actors).values(actor);
  return result[0].insertId;
}

// Issue queries
export async function getUserIssues(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(issues).where(eq(issues.userId, userId));
}

export async function createIssue(issue: InsertIssue) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(issues).values(issue);
  return result[0].insertId;
}
