import { pgTable, text, timestamp, integer, serial, varchar, boolean } from "drizzle-orm/pg-core";

/**
 * users Table
 * Stores login information.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 120 }), // From signup
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/**
 * sessions Table
 * Required by better-auth for managing login sessions.
 */
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // This stores the secure token for email/password sessions
  token: text("token").notNull().unique(), 
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/**
 * passwordResetTokens Table
 * Temporary tokens for password reset flows.
 */
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/**
 * campaigns Table
 * Stores all campaign data created by users.
 */
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  imageUrl: text("image_url"),
  price: integer("price").notNull(), // Price in cents
  goal: integer("goal").notNull(),     // Goal in cents
  currentAmountRaised: integer("current_amount_raised").default(0).notNull(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/**
 * orders Table (UPDATED)
 * Your admin fulfillment queue.
 */
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  
  // Links
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  userId: integer("user_id").notNull().references(() => users.id), // The campaign creator
  
  // Campaign Info
  campaignTitle: varchar("title", { length: 255 }),
  
  // Customer Info (NEW)
  customerName: text("customer_name"),
  customerEmail: varchar("customer_email", { length: 255 }).notNull(),
  shippingAddress: text("shipping_address"), // Stored as a JSON string
  
  // Order Info
  amountPaid: integer("amount_paid").notNull(), // Amount in cents
  paymentIntentId: text("payment_intent_id").notNull(), // Stripe PaymentIntent ID for capture
  paymentStatus: varchar("payment_status", { length: 50 }).default("completed").notNull(),
  fulfillmentStatus: varchar("fulfillment_status", { length: 50 }).default("PENDING").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});