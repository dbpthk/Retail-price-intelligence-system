CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"old_price" text NOT NULL,
	"new_price" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"price" text NOT NULL,
	"checked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"current_price" text NOT NULL,
	"last_checked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_product_id_idx" ON "notifications" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "notifications_sent_at_idx" ON "notifications" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "price_history_product_id_idx" ON "price_history" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "price_history_checked_at_idx" ON "price_history" USING btree ("checked_at");--> statement-breakpoint
CREATE INDEX "products_user_id_idx" ON "products" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "products_last_checked_at_idx" ON "products" USING btree ("last_checked_at");