-- CreateTable
CREATE TABLE "public"."mastra_artifacts" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "content" BYTEA NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "traceId" TEXT,
    "threadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mastra_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mastra_artifacts_sessionId_idx" ON "public"."mastra_artifacts"("sessionId");

-- CreateIndex
CREATE INDEX "mastra_artifacts_fileType_idx" ON "public"."mastra_artifacts"("fileType");

-- CreateIndex
CREATE INDEX "mastra_artifacts_traceId_idx" ON "public"."mastra_artifacts"("traceId");

-- CreateIndex
CREATE INDEX "mastra_artifacts_createdAt_idx" ON "public"."mastra_artifacts"("createdAt");
