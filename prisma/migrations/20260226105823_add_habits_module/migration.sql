-- CreateTable
CREATE TABLE "HabitCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HabitCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT,
    "frequencyType" TEXT NOT NULL DEFAULT 'daily',
    "frequencyTarget" INTEGER NOT NULL DEFAULT 1,
    "frequencyPeriod" TEXT NOT NULL DEFAULT 'day',
    "frequencyDays" TEXT,
    "reminderTime" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitCompletion" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HabitCategory_userId_idx" ON "HabitCategory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HabitCategory_userId_name_key" ON "HabitCategory"("userId", "name");

-- CreateIndex
CREATE INDEX "Habit_userId_isArchived_idx" ON "Habit"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "Habit_userId_categoryId_idx" ON "Habit"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "HabitCompletion_habitId_completedAt_idx" ON "HabitCompletion"("habitId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HabitCompletion_habitId_completedAt_key" ON "HabitCompletion"("habitId", "completedAt");

-- AddForeignKey
ALTER TABLE "HabitCategory" ADD CONSTRAINT "HabitCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "HabitCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitCompletion" ADD CONSTRAINT "HabitCompletion_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
