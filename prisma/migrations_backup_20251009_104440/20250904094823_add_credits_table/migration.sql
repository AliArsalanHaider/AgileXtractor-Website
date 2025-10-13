-- CreateTable
CREATE TABLE "public"."credits" (
    "Account_ID" SERIAL NOT NULL,
    "Email_ID" TEXT NOT NULL,
    "Total_Credits" INTEGER NOT NULL DEFAULT 0,
    "Consumed_Credits" INTEGER NOT NULL DEFAULT 0,
    "Remaining_Credits" INTEGER NOT NULL DEFAULT 0,
    "Active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "credits_pkey" PRIMARY KEY ("Account_ID")
);

-- CreateIndex
CREATE UNIQUE INDEX "credits_Email_ID_key" ON "public"."credits"("Email_ID");
