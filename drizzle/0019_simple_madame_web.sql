ALTER TABLE "miles_programs" ADD COLUMN "reference_value_per_1000_brl" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "miles_transactions" ADD COLUMN "cost_brl" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "miles_transactions" ADD COLUMN "cash_equivalent_brl" numeric(12, 2);