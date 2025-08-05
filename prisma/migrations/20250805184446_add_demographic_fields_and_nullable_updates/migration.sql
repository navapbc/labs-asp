-- AlterTable
ALTER TABLE "household_dependents" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "ethnicity" TEXT,
ADD COLUMN     "genderIdentity" TEXT,
ADD COLUMN     "race" TEXT,
ADD COLUMN     "sexAtBirth" TEXT,
ALTER COLUMN "lastName" DROP NOT NULL,
ALTER COLUMN "dateOfBirth" DROP NOT NULL,
ALTER COLUMN "relationship" DROP NOT NULL;

-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "benefitsReceiving" TEXT,
ADD COLUMN     "ethnicity" TEXT,
ADD COLUMN     "genderIdentity" TEXT,
ADD COLUMN     "isVeteran" BOOLEAN,
ADD COLUMN     "onProbation" BOOLEAN,
ADD COLUMN     "race" TEXT,
ADD COLUMN     "relationshipStatus" TEXT,
ADD COLUMN     "sexAtBirth" TEXT,
ALTER COLUMN "lastName" DROP NOT NULL,
ALTER COLUMN "dateOfBirth" DROP NOT NULL,
ALTER COLUMN "homeAddress" DROP NOT NULL,
ALTER COLUMN "mobileNumber" DROP NOT NULL;
