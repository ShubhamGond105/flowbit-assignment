// apps/api/prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

function findDataFile() {
  const candidates = [
    path.join(__dirname, "../../data/Analytics_Test_Data.json"),
    path.join(__dirname, "../../../data/Analytics_Test_Data.json"),
    path.join(__dirname, "../../../../data/Analytics_Test_Data.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

async function upsertVendorByName(vendorName, vendorData) {
  // Try to find vendor by name (name is not unique in schema, so use findFirst)
  const existing = await prisma.vendor.findFirst({
    where: { name: vendorName },
  });

  const dataToSet = {};
  if (vendorData && (vendorData.tax_id || vendorData.taxId)) dataToSet.taxId = vendorData.tax_id || vendorData.taxId;
  if (vendorData && vendorData.address) dataToSet.address = vendorData.address;
  if (vendorData && vendorData.email) dataToSet.email = vendorData.email;

  if (existing) {
    if (Object.keys(dataToSet).length) {
      return prisma.vendor.update({
        where: { id: existing.id },
        data: dataToSet,
      });
    }
    return existing;
  } else {
    const createData = { name: vendorName };
    if (dataToSet.taxId) createData.taxId = dataToSet.taxId;
    if (dataToSet.address) createData.address = dataToSet.address;
    if (dataToSet.email) createData.email = dataToSet.email;
    return prisma.vendor.create({ data: createData });
  }
}

async function main() {
  const file = findDataFile();
  if (!file) {
    console.error("Data file not found. Checked these candidate paths relative to:", __dirname);
    console.error([
      path.join(__dirname, "../../data/Analytics_Test_Data.json"),
      path.join(__dirname, "../../../data/Analytics_Test_Data.json"),
      path.join(__dirname, "../../../../data/Analytics_Test_Data.json"),
    ]);
    process.exit(1);
  }

  console.log("Using data file:", file);
  const raw = fs.readFileSync(file, "utf8");
  const parsed = JSON.parse(raw);
  const invoices = Array.isArray(parsed) ? parsed : (parsed.invoices || []);
  console.log("Found", invoices.length, "invoices to seed.");

  for (const inv of invoices) {
    const vendorData = inv.vendor || inv.supplier || {};
    const vendorName = vendorData.name || vendorData.company || "Unknown Vendor";

    // create or update vendor safely
    const vendor = await upsertVendorByName(vendorName, vendorData);

    // create invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: inv.invoice_number || inv.number || `INV-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        vendorId: vendor.id,
        date: inv.date ? new Date(inv.date) : new Date(),
        dueDate: inv.due_date ? new Date(inv.due_date) : null,
        currency: inv.currency || "USD",
        totalAmount: safeNumber(inv.total_amount, 0),
        status: inv.status || "unpaid",
      },
    });

    // line items
    const items = inv.line_items || inv.items || [];
    for (const li of items) {
      const qty = safeNumber(li.quantity, 1);
      const unitPrice = safeNumber(li.unit_price || li.price, 0);
      const totalVal = (li.total === undefined || li.total === null) ? qty * unitPrice : safeNumber(li.total, qty * unitPrice);

      await prisma.lineItem.create({
        data: {
          invoiceId: invoice.id,
          description: li.description || li.name || null,
          quantity: qty,
          unitPrice: unitPrice,
          tax: (li.tax === undefined || li.tax === null) ? undefined : safeNumber(li.tax, 0),
          category: li.category || null,
          total: totalVal,
        },
      });
    }

    // payments
    const payments = inv.payments || [];
    for (const p of payments) {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: safeNumber(p.amount, 0),
          paidAt: p.paid_at ? new Date(p.paid_at) : new Date(),
          method: p.method || null,
          reference: p.reference || null,
        },
      });
    }
  }

  console.log("Seeding completed.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
