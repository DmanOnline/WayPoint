-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "frequencyInterval" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "HabitCompletion" ADD COLUMN     "count" INTEGER NOT NULL DEFAULT 1;
