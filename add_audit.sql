ALTER TABLE "public"."credits"
  ADD COLUMN IF NOT EXISTS "Created_At" timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "Updated_At" timestamptz NOT NULL DEFAULT now();
