-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'analyst',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "ApiUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT NOT NULL DEFAULT 'claude-sonnet-4-5',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Regulator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "website" TEXT,
    "rssFeedUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Regulator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Regulation" (
    "id" TEXT NOT NULL,
    "regulatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "citation" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Regulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "regulationId" TEXT NOT NULL,
    "parentId" TEXT,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "effectiveDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Obligation" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "obligationType" TEXT NOT NULL,
    "addressee" TEXT NOT NULL,
    "actionText" TEXT NOT NULL,
    "objectText" TEXT,
    "conditionText" TEXT,
    "summary" TEXT NOT NULL,
    "evidenceScope" TEXT NOT NULL DEFAULT 'term_required',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "extractedBy" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Obligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTypeAttribute" (
    "id" TEXT NOT NULL,
    "productTypeId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ProductTypeAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObligationProductApplicability" (
    "id" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "productTypeId" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION NOT NULL,
    "rationale" TEXT,

    CONSTRAINT "ObligationProductApplicability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productTypeId" TEXT NOT NULL,
    "description" TEXT,
    "jurisdictions" TEXT[],
    "customerType" TEXT NOT NULL,
    "distributionChannel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDocument" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "analysisStatus" TEXT NOT NULL DEFAULT 'pending',
    "analysisResult" JSONB,
    "analysisError" TEXT,
    "analysisCompletedAt" TIMESTAMP(3),
    "readabilityScore" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceMatrixEntry" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "complianceStatus" TEXT NOT NULL DEFAULT 'not_assessed',
    "owner" TEXT,
    "evidence" TEXT,
    "notes" TEXT,
    "documentEvidence" JSONB,
    "evidenceSource" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceMatrixEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClauseTemplate" (
    "id" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "templateText" TEXT NOT NULL,
    "guidance" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClauseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceControl" (
    "id" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "owner" TEXT,
    "status" TEXT NOT NULL,

    CONSTRAINT "ComplianceControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulationCrossReference" (
    "id" TEXT NOT NULL,
    "fromRegId" TEXT NOT NULL,
    "toRegId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,

    CONSTRAINT "RegulationCrossReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulationVersion" (
    "id" TEXT NOT NULL,
    "regulationId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "publishedDate" TIMESTAMP(3) NOT NULL,
    "changeSummary" TEXT NOT NULL,
    "sourceUrl" TEXT,

    CONSTRAINT "RegulationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObligationChange" (
    "id" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "oldText" TEXT,
    "newText" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObligationChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchJob" (
    "id" TEXT NOT NULL,
    "anthropicBatchId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "totalRequests" INTEGER NOT NULL,
    "succeededCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "BatchJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchJobItem" (
    "id" TEXT NOT NULL,
    "batchJobId" TEXT NOT NULL,
    "customId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "regulationTitle" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" JSONB,

    CONSTRAINT "BatchJobItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "ApiUsage_userId_idx" ON "ApiUsage"("userId");

-- CreateIndex
CREATE INDEX "ApiUsage_createdAt_idx" ON "ApiUsage"("createdAt");

-- CreateIndex
CREATE INDEX "Regulation_regulatorId_idx" ON "Regulation"("regulatorId");

-- CreateIndex
CREATE INDEX "Section_regulationId_idx" ON "Section"("regulationId");

-- CreateIndex
CREATE INDEX "Section_parentId_idx" ON "Section"("parentId");

-- CreateIndex
CREATE INDEX "Rule_sectionId_idx" ON "Rule"("sectionId");

-- CreateIndex
CREATE INDEX "Obligation_ruleId_idx" ON "Obligation"("ruleId");

-- CreateIndex
CREATE INDEX "Obligation_obligationType_idx" ON "Obligation"("obligationType");

-- CreateIndex
CREATE INDEX "Obligation_evidenceScope_idx" ON "Obligation"("evidenceScope");

-- CreateIndex
CREATE INDEX "ProductType_category_idx" ON "ProductType"("category");

-- CreateIndex
CREATE INDEX "ProductTypeAttribute_productTypeId_idx" ON "ProductTypeAttribute"("productTypeId");

-- CreateIndex
CREATE INDEX "ObligationProductApplicability_obligationId_idx" ON "ObligationProductApplicability"("obligationId");

-- CreateIndex
CREATE INDEX "ObligationProductApplicability_productTypeId_idx" ON "ObligationProductApplicability"("productTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "ObligationProductApplicability_obligationId_productTypeId_key" ON "ObligationProductApplicability"("obligationId", "productTypeId");

-- CreateIndex
CREATE INDEX "Product_productTypeId_idx" ON "Product"("productTypeId");

-- CreateIndex
CREATE INDEX "ProductDocument_productId_idx" ON "ProductDocument"("productId");

-- CreateIndex
CREATE INDEX "ProductDocument_productId_documentType_idx" ON "ProductDocument"("productId", "documentType");

-- CreateIndex
CREATE INDEX "ComplianceMatrixEntry_productId_idx" ON "ComplianceMatrixEntry"("productId");

-- CreateIndex
CREATE INDEX "ComplianceMatrixEntry_obligationId_idx" ON "ComplianceMatrixEntry"("obligationId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceMatrixEntry_productId_obligationId_key" ON "ComplianceMatrixEntry"("productId", "obligationId");

-- CreateIndex
CREATE INDEX "ClauseTemplate_obligationId_idx" ON "ClauseTemplate"("obligationId");

-- CreateIndex
CREATE INDEX "ComplianceControl_obligationId_idx" ON "ComplianceControl"("obligationId");

-- CreateIndex
CREATE INDEX "RegulationVersion_regulationId_idx" ON "RegulationVersion"("regulationId");

-- CreateIndex
CREATE INDEX "ObligationChange_obligationId_idx" ON "ObligationChange"("obligationId");

-- CreateIndex
CREATE UNIQUE INDEX "BatchJob_anthropicBatchId_key" ON "BatchJob"("anthropicBatchId");

-- CreateIndex
CREATE INDEX "BatchJobItem_batchJobId_idx" ON "BatchJobItem"("batchJobId");

-- CreateIndex
CREATE INDEX "BatchJobItem_documentId_idx" ON "BatchJobItem"("documentId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiUsage" ADD CONSTRAINT "ApiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Regulation" ADD CONSTRAINT "Regulation_regulatorId_fkey" FOREIGN KEY ("regulatorId") REFERENCES "Regulator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "Regulation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obligation" ADD CONSTRAINT "Obligation_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTypeAttribute" ADD CONSTRAINT "ProductTypeAttribute_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObligationProductApplicability" ADD CONSTRAINT "ObligationProductApplicability_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "Obligation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObligationProductApplicability" ADD CONSTRAINT "ObligationProductApplicability_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDocument" ADD CONSTRAINT "ProductDocument_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceMatrixEntry" ADD CONSTRAINT "ComplianceMatrixEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceMatrixEntry" ADD CONSTRAINT "ComplianceMatrixEntry_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "Obligation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClauseTemplate" ADD CONSTRAINT "ClauseTemplate_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "Obligation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceControl" ADD CONSTRAINT "ComplianceControl_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "Obligation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulationCrossReference" ADD CONSTRAINT "RegulationCrossReference_fromRegId_fkey" FOREIGN KEY ("fromRegId") REFERENCES "Regulation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulationCrossReference" ADD CONSTRAINT "RegulationCrossReference_toRegId_fkey" FOREIGN KEY ("toRegId") REFERENCES "Regulation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulationVersion" ADD CONSTRAINT "RegulationVersion_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "Regulation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObligationChange" ADD CONSTRAINT "ObligationChange_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "Obligation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchJobItem" ADD CONSTRAINT "BatchJobItem_batchJobId_fkey" FOREIGN KEY ("batchJobId") REFERENCES "BatchJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
