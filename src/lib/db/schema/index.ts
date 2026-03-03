import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "@/lib/schema";

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    url: text("url").notNull(),
    currentPrice: text("current_price").notNull(),
    lastCheckedAt: timestamp("last_checked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("products_user_id_idx").on(table.userId),
    index("products_last_checked_at_idx").on(table.lastCheckedAt),
  ]
);

export const priceHistory = pgTable(
  "price_history",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    price: text("price").notNull(),
    checkedAt: timestamp("checked_at").defaultNow().notNull(),
  },
  (table) => [
    index("price_history_product_id_idx").on(table.productId),
    index("price_history_checked_at_idx").on(table.checkedAt),
  ]
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    oldPrice: text("old_price").notNull(),
    newPrice: text("new_price").notNull(),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_product_id_idx").on(table.productId),
    index("notifications_sent_at_idx").on(table.sentAt),
  ]
);

export const productsRelations = relations(products, ({ one, many }) => ({
  user: one(user, {
    fields: [products.userId],
    references: [user.id],
  }),
  priceHistory: many(priceHistory),
  notifications: many(notifications),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  product: one(products, {
    fields: [priceHistory.productId],
    references: [products.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  product: one(products, {
    fields: [notifications.productId],
    references: [products.id],
  }),
}));
