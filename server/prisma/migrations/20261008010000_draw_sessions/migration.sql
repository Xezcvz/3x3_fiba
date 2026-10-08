CREATE TABLE "DrawSession" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "assignments" JSONB NOT NULL,
    "drawOrder" JSONB NOT NULL,
    "drawIndex" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrawSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DrawSession_expiresAt_idx" ON "DrawSession"("expiresAt");
