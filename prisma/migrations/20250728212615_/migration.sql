-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "homeAddress" TEXT NOT NULL,
    "mailingAddress" TEXT,
    "mobileNumber" TEXT NOT NULL,
    "canReceiveTexts" BOOLEAN NOT NULL DEFAULT false,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'English',
    "email" TEXT,
    "hasMediCal" BOOLEAN NOT NULL DEFAULT false,
    "mediCalCaseNumber" TEXT,
    "mediCalAmount" DECIMAL(65,30),
    "isPregnant" BOOLEAN NOT NULL DEFAULT false,
    "isPostPartum" BOOLEAN NOT NULL DEFAULT false,
    "isInfantBreastfeeding" BOOLEAN NOT NULL DEFAULT false,
    "isInfantFormula" BOOLEAN NOT NULL DEFAULT false,
    "hasChildren0to5" BOOLEAN NOT NULL DEFAULT false,
    "monthlyIncome" DECIMAL(65,30),
    "occupation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_dependents" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "relationship" TEXT NOT NULL,
    "isInfant" BOOLEAN NOT NULL DEFAULT false,
    "isChild0to5" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "household_dependents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "participants_participantId_key" ON "participants"("participantId");

-- AddForeignKey
ALTER TABLE "household_dependents" ADD CONSTRAINT "household_dependents_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
