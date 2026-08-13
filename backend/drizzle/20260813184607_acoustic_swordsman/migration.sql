ALTER TABLE "users" ADD COLUMN "display_name" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "settings" text DEFAULT '{}';