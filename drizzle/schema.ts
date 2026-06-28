import { int, mysqlEnum, mysqlTable, text, longtext, timestamp, varchar, datetime, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Documents uploaded by users for chronology building
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalFilename: varchar("originalFilename", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: int("fileSize").notNull(), // in bytes
  s3Key: varchar("s3Key", { length: 512 }).notNull(),
  s3Url: text("s3Url").notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  extractedText: longtext("extractedText"), // Raw extracted text (supports up to 4GB)
  documentTitle: text("documentTitle"), // AI-generated smart title
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Extracted facts/events from documents
 */
export const facts = mysqlTable("facts", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  userId: int("userId").notNull(),
  
  // Core fact data
  eventDate: datetime("eventDate").notNull(), // Normalized date
  originalDateText: varchar("originalDateText", { length: 255 }), // Original date string from document
  summary: text("summary").notNull(), // 1-2 sentence summary
  fullText: text("fullText"), // Full extracted text for this fact
  
  // Categorization
  actor: varchar("actor", { length: 255 }), // Person/entity involved
  issue: varchar("issue", { length: 255 }), // Legacy single AI issue (unused)
  aiIssues: json("aiIssues").$type<string[]>(), // AI-assigned neutral issue labels (from case memory's set)
  userIssues: json("userIssues").$type<string[]>(), // User-editable issue tags (override AI when set)
  citation: text("citation"), // Legal citation if present
  comments: text("comments"), // User-editable comments
  
  // Metadata
  pageNumber: int("pageNumber"), // Source page in document
  confidence: int("confidence").default(100), // Generic event importance (0-100), case-agnostic

  // Case-contextual materiality (derived from the user's Case Memory)
  materiality: int("materiality"), // AI relevance to THIS case, 0-100 (null = not yet evaluated)
  materialityReason: text("materialityReason"), // One-line rationale for why it is / isn't key
  isKeyOverride: boolean("isKeyOverride"), // User override; null = follow AI threshold

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Fact = typeof facts.$inferSelect;
export type InsertFact = typeof facts.$inferInsert;

/**
 * Case Memory: the AI-deduced (user-editable) theory of the case that drives
 * materiality scoring. One row per user for now; the `id` PK keeps the door
 * open to a multi-case model later.
 */
export const caseMemory = mysqlTable("case_memory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // one case per user (for now)
  title: text("title"), // short case label
  summary: longtext("summary"), // narrative case summary (editable)
  parties: json("parties").$type<string[]>(), // key parties
  issues: json("issues").$type<string[]>(), // disputed issues / claims (detailed)
  issueLabels: json("issueLabels").$type<string[]>(), // short, neutral issue labels (the tag set)
  source: mysqlEnum("source", ["ai", "user", "uploaded"]).default("ai").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CaseMemory = typeof caseMemory.$inferSelect;
export type InsertCaseMemory = typeof caseMemory.$inferInsert;

/**
 * Dramatis personae: the AI-generated cast of parties for a case. Roles and
 * narratives are stored; the document references are derived from facts at read
 * time so they stay in sync with the chronology.
 */
export const dramatisPersonae = mysqlTable("dramatis_personae", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: text("role"),
  narrative: text("narrative"),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DramatisPersona = typeof dramatisPersonae.$inferSelect;
export type InsertDramatisPersona = typeof dramatisPersonae.$inferInsert;

/**
 * Actor categories for filtering
 */
export const actors = mysqlTable("actors", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }), // Hex color for UI
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Actor = typeof actors.$inferSelect;
export type InsertActor = typeof actors.$inferInsert;

/**
 * Issue categories for filtering
 */
export const issues = mysqlTable("issues", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }), // Hex color for UI
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Issue = typeof issues.$inferSelect;
export type InsertIssue = typeof issues.$inferInsert;
