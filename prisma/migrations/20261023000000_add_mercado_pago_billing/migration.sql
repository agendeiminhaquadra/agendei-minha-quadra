ALTER TABLE "Tenant"
  ADD COLUMN "mercadoPagoSubscriptionId" TEXT;

CREATE UNIQUE INDEX "Tenant_mercadoPagoSubscriptionId_key"
  ON "Tenant"("mercadoPagoSubscriptionId");

CREATE TABLE "MercadoPagoWebhookEvent" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MercadoPagoWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MercadoPagoWebhookEvent_eventId_key"
  ON "MercadoPagoWebhookEvent"("eventId");
