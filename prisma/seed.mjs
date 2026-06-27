// Seed script — runs with: node prisma/seed.mjs
// Uses pg directly to avoid Prisma ESM path issues in local dev

import pg from "pg";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read DATABASE_URL from .env manually
const envPath = join(__dirname, "../.env");
const envContent = readFileSync(envPath, "utf-8");
const match = envContent.match(/DATABASE_URL\s*=\s*"([^"]+)"/);
if (!match) { console.error("DATABASE_URL not found in .env"); process.exit(1); }
const DATABASE_URL = match[1];

const client = new pg.Client({ connectionString: DATABASE_URL });

function cuid() {
  // simple cuid-like ID for seeding
  return "c" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

async function main() {
  await client.connect();
  console.log("🌱 Seeding database...");

  // Clean existing data
  await client.query('DELETE FROM "reservations"');
  await client.query('DELETE FROM "stock"');
  await client.query('DELETE FROM "products"');
  await client.query('DELETE FROM "warehouses"');

  // Warehouses
  const wA = cuid(), wB = cuid();
  await client.query(
    `INSERT INTO "warehouses" ("id","name","location","createdAt","updatedAt") VALUES ($1,$2,$3,NOW(),NOW()), ($4,$5,$6,NOW(),NOW())`,
    [wA, "Mumbai Central", "Mumbai, Maharashtra", wB, "Delhi North", "Delhi, NCR"]
  );
  console.log("✅ Created 2 warehouses");

  // Products
  const products = [
    [cuid(), "Wireless Noise-Cancelling Headphones", "Premium over-ear headphones with 30hr battery life and active noise cancellation.", "WNC-H100", 8999.00, "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80"],
    [cuid(), "Mechanical Keyboard TKL", "Tenkeyless mechanical keyboard with Cherry MX switches, RGB backlight.", "MKB-TKL87", 5499.00, "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=80"],
    [cuid(), "4K Webcam Pro", "Ultra-HD webcam with auto-focus, built-in ring light and noise-cancelling mic.", "CAM-4KP", 6299.00, "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&q=80"],
    [cuid(), "Ergonomic Office Chair", "Lumbar support mesh chair with adjustable armrests and recline function.", "CHR-ERG1", 22999.00, "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400&q=80"],
    [cuid(), "USB-C Hub 10-in-1", "Multi-port hub with HDMI 4K, 100W PD, USB 3.0, SD card reader, and ethernet.", "HUB-UC10", 3299.00, "https://images.unsplash.com/photo-1625961332771-3f40b0e2bdcf?w=400&q=80"],
    [cuid(), "Portable SSD 1TB", "NVMe portable drive with 1050MB/s read speed and rugged aluminium shell.", "SSD-P1TB", 9499.00, "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&q=80"],
  ];

  for (const [id, name, description, sku, price, imageUrl] of products) {
    await client.query(
      `INSERT INTO "products" ("id","name","description","sku","price","imageUrl","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
      [id, name, description, sku, price, imageUrl]
    );
  }
  console.log(`✅ Created ${products.length} products`);

  // Stock
  const stockData = [
    [products[0][0], wA, 50], [products[0][0], wB, 30],
    [products[1][0], wA, 2],  [products[1][0], wB, 15],  // low stock in Mumbai
    [products[2][0], wA, 20], [products[2][0], wB, 10],
    [products[3][0], wA, 1],  [products[3][0], wB, 3],   // very low
    [products[4][0], wA, 40], [products[4][0], wB, 25],
    [products[5][0], wA, 8],  [products[5][0], wB, 5],
  ];

  for (const [productId, warehouseId, totalUnits] of stockData) {
    await client.query(
      `INSERT INTO "stock" ("id","productId","warehouseId","totalUnits","reservedUnits","createdAt","updatedAt") VALUES ($1,$2,$3,$4,0,NOW(),NOW())`,
      [cuid(), productId, warehouseId, totalUnits]
    );
  }
  console.log(`✅ Created ${stockData.length} stock entries`);

  console.log("🎉 Seed complete!");
  await client.end();
}

main().catch(e => { console.error(e); client.end(); process.exit(1); });
