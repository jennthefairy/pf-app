import { pgTable, text, timestamp, integer, serial, varchar, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * users Table
 * Stores login information.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull().default(""), // From signup
  image: text("image"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  
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
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  activeAt: timestamp("active_at").notNull(),

});

/**
 * accounts Table (better-auth)
 * Stores linked auth provider accounts.
 * For email/password, providerId = "credential" and password holds the hash.
 */
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  providerId: varchar("provider_id", { length: 100 }).notNull(),
  accountId: text("account_id").notNull(),

  // OAuth fields (optional)
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),

  // Credential provider
  password: text("password"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * verifications Table (better-auth)
 * Stores ephemeral verification values (password reset tokens, oauth state, etc.)
 */
export const verifications = pgTable("verifications", {
  id: serial("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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

export const credits = pgTable("credits", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  balance: integer("balance").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
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

// Relations must be declared after all tables to avoid forward-reference issues.
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  campaigns: many(campaigns),
  orders: many(orders),
  passwordResetTokens: many(passwordResetTokens),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, { fields: [campaigns.userId], references: [users.id] }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  campaign: one(campaigns, { fields: [orders.campaignId], references: [campaigns.id] }),
}));
