ALTER TABLE "Tenant"
  ADD COLUMN "fantasyName" TEXT,
  ADD COLUMN "responsibleName" TEXT,
  ADD COLUMN "responsibleDocument" TEXT,
  ADD COLUMN "coverImageUrl" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "whatsapp" TEXT,
  ADD COLUMN "streetNumber" TEXT,
  ADD COLUMN "complement" TEXT,
  ADD COLUMN "neighborhood" TEXT,
  ADD COLUMN "postalCode" TEXT,
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD COLUMN "websiteUrl" TEXT,
  ADD COLUMN "instagramUrl" TEXT,
  ADD COLUMN "facebookUrl" TEXT,
  ADD COLUMN "onlineBookingEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "slotIntervalMinutes" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN "minBookingNoticeMinutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "maxAdvanceBookingDays" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "bookingBufferMinutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cancellationDeadlineHours" INTEGER NOT NULL DEFAULT 24;

ALTER TABLE "User"
  ADD COLUMN "canManageBookings" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "canCancelBookings" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canAccessFinance" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canManagePricing" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canManageSchedule" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canManageStaff" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "BusinessHours" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "isOpen" BOOLEAN NOT NULL DEFAULT true,
  "openTime" TEXT NOT NULL DEFAULT '08:00',
  "closeTime" TEXT NOT NULL DEFAULT '23:00',
  "breakStart" TEXT,
  "breakEnd" TEXT,
  CONSTRAINT "BusinessHours_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessHours_tenantId_weekday_key" ON "BusinessHours"("tenantId", "weekday");
CREATE INDEX "BusinessHours_tenantId_idx" ON "BusinessHours"("tenantId");
ALTER TABLE "BusinessHours" ADD CONSTRAINT "BusinessHours_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
