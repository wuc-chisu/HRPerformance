-- CreateTable
CREATE TABLE "MonthlyPerformanceComment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyPerformanceComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyPerformanceComment_employeeId_idx" ON "MonthlyPerformanceComment"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyPerformanceComment_employeeId_year_month_key" ON "MonthlyPerformanceComment"("employeeId", "year", "month");

-- AddForeignKey
ALTER TABLE "MonthlyPerformanceComment" ADD CONSTRAINT "MonthlyPerformanceComment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
