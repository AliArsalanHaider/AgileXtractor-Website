-- CreateTable
CREATE TABLE "public"."credits" (
    "Account_ID" SERIAL NOT NULL,
    "Email_ID" TEXT NOT NULL,
    "Total_Credits" INTEGER NOT NULL DEFAULT 0,
    "Consumed_Credits" INTEGER NOT NULL DEFAULT 0,
    "Remaining_Credits" INTEGER NOT NULL DEFAULT 0,
    "Active" BOOLEAN NOT NULL DEFAULT true,
    "Profile" JSONB,
    "Created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Updated_At" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credits_pkey" PRIMARY KEY ("Account_ID")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "accountId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "lastExtractAt" TIMESTAMP(3),
    "extractResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "plan" TEXT,
    "billingCycle" TEXT,
    "status" TEXT,
    "stripeCustomerId" TEXT,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailVerifyToken" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "EmailVerifyToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credits_Email_ID_key" ON "public"."credits"("Email_ID");

-- CreateIndex
CREATE INDEX "Document_accountId_createdAt_idx" ON "public"."Document"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "Document_email_idx" ON "public"."Document"("email");

-- CreateIndex
CREATE INDEX "Document_sha256_idx" ON "public"."Document"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "public"."User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerifyToken_tokenHash_key" ON "public"."EmailVerifyToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerifyToken_identifier_idx" ON "public"."EmailVerifyToken"("identifier");

-- CreateIndex
CREATE INDEX "EmailVerifyToken_expires_idx" ON "public"."EmailVerifyToken"("expires");
