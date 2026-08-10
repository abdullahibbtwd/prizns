-- COD + estimated arrival on products; payment method on orders
CREATE TYPE "ShopPaymentMethod" AS ENUM ('STRIPE', 'COD');

ALTER TABLE "products" ADD COLUMN "allow_cod" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN "estimated_arrival_bg" TEXT NOT NULL DEFAULT '';
ALTER TABLE "products" ADD COLUMN "estimated_arrival_en" TEXT;

ALTER TABLE "shop_orders" ADD COLUMN "payment_method" "ShopPaymentMethod" NOT NULL DEFAULT 'STRIPE';
ALTER TABLE "shop_orders" ADD COLUMN "estimated_arrival" TEXT;
