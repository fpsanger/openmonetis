CREATE TABLE "miles_lot_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"lot_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"consumed_amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "miles_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"original_amount" integer NOT NULL,
	"remaining_amount" integer NOT NULL,
	"occurred_at" date NOT NULL,
	"expires_at" date,
	"cost_brl" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "miles_lot_allocations" ADD CONSTRAINT "miles_lot_allocations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "miles_lot_allocations" ADD CONSTRAINT "miles_lot_allocations_lot_id_miles_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."miles_lots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "miles_lot_allocations" ADD CONSTRAINT "miles_lot_allocations_transaction_id_miles_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."miles_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "miles_lots" ADD CONSTRAINT "miles_lots_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "miles_lots" ADD CONSTRAINT "miles_lots_account_id_miles_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."miles_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "miles_lots" ADD CONSTRAINT "miles_lots_transaction_id_miles_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."miles_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "miles_lot_allocations_lot_id_idx" ON "miles_lot_allocations" USING btree ("lot_id");--> statement-breakpoint
CREATE INDEX "miles_lot_allocations_transaction_id_idx" ON "miles_lot_allocations" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "miles_lots_account_id_occurred_at_idx" ON "miles_lots" USING btree ("account_id","occurred_at");--> statement-breakpoint
CREATE INDEX "miles_lots_transaction_id_idx" ON "miles_lots" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "miles_lots_user_id_idx" ON "miles_lots" USING btree ("user_id");