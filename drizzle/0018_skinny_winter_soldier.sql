CREATE TABLE "miles_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"program_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "miles_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "miles_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"occurred_at" date NOT NULL,
	"expires_at" date,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "miles_accounts" ADD CONSTRAINT "miles_accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "miles_accounts" ADD CONSTRAINT "miles_accounts_program_id_miles_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."miles_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "miles_programs" ADD CONSTRAINT "miles_programs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "miles_transactions" ADD CONSTRAINT "miles_transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "miles_transactions" ADD CONSTRAINT "miles_transactions_account_id_miles_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."miles_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "miles_accounts_user_id_idx" ON "miles_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "miles_accounts_user_id_program_id_idx" ON "miles_accounts" USING btree ("user_id","program_id");--> statement-breakpoint
CREATE INDEX "miles_programs_user_id_idx" ON "miles_programs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "miles_transactions_user_id_idx" ON "miles_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "miles_transactions_account_id_occurred_at_idx" ON "miles_transactions" USING btree ("account_id","occurred_at");--> statement-breakpoint
CREATE INDEX "miles_transactions_user_id_occurred_at_idx" ON "miles_transactions" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "miles_transactions_account_id_expires_at_idx" ON "miles_transactions" USING btree ("account_id","expires_at");