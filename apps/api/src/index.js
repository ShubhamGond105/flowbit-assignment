// /apps/api/src/index.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { PrismaClient } = require("@prisma/client");
const fetch = require("node-fetch");

const prisma = new PrismaClient();
const app = express();

app.use(cors({ origin: process.env.NEXT_PUBLIC_APP_URL || "*" }));
app.use(bodyParser.json());

// ✅ /stats
app.get("/stats", async (req, res) => {
  try {
    const totalSpendAgg = await prisma.invoice.aggregate({
      _sum: { totalAmount: true },
    });
    const totalSpend = totalSpendAgg._sum.totalAmount || 0;
    const totalInvoices = await prisma.invoice.count();
    const documentsUploaded = await prisma.document.count();
    const avgAgg = await prisma.invoice.aggregate({
      _avg: { totalAmount: true },
    });
    const avgInvoiceValue = avgAgg._avg.totalAmount || 0;

    res.json({
      totalSpend: Number(totalSpend),
      totalInvoices,
      documentsUploaded,
      avgInvoiceValue: Number(avgInvoiceValue),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

// ✅ /invoice-trends
app.get("/invoice-trends", async (req, res) => {
  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT date_trunc('month', i.date) AS month,
             COUNT(*)::int AS invoice_count,
             SUM(i.total_amount)::float AS spend
      FROM "Invoice" i
      GROUP BY month
      ORDER BY month;
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

// ✅ /vendors/top10
app.get("/vendors/top10", async (req, res) => {
  try {
    const data = await prisma.$queryRawUnsafe(`
      SELECT v.id, v.name, SUM(i.total_amount)::float AS spend
      FROM "Vendor" v
      JOIN "Invoice" i ON i."vendorId" = v.id
      GROUP BY v.id, v.name
      ORDER BY spend DESC
      LIMIT 10;
    `);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

// ✅ /category-spend
app.get("/category-spend", async (req, res) => {
  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT COALESCE(li.category, 'Uncategorized') AS category,
             SUM(li.total)::float AS spend
      FROM "LineItem" li
      GROUP BY category
      ORDER BY spend DESC;
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

// ✅ /cash-outflow
app.get("/cash-outflow", async (req, res) => {
  try {
    const from = req.query.from;
    const to = req.query.to;
    let where = "WHERE i.due_date IS NOT NULL";
    if (from) where += ` AND i.due_date >= '${from}'`;
    if (to) where += ` AND i.due_date <= '${to}'`;

    const rows = await prisma.$queryRawUnsafe(`
      SELECT date_trunc('day', i.due_date) AS day,
             SUM(i.total_amount)::float AS expected_outflow
      FROM "Invoice" i
      ${where}
      GROUP BY day
      ORDER BY day;
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

// ✅ /invoices
app.get("/invoices", async (req, res) => {
  try {
    const q = req.query.q || "";
    const status = req.query.status;
    const vendor = req.query.vendor;
    const limit = parseInt(req.query.limit || "50", 10);
    const offset = parseInt(req.query.offset || "0", 10);

    let whereClauses = [];
    if (q)
      whereClauses.push(
        `(i.invoice_number ILIKE '%${q}%' OR v.name ILIKE '%${q}%')`
      );
    if (status) whereClauses.push(`i.status = '${status}'`);
    if (vendor) whereClauses.push(`v.name ILIKE '%${vendor}%'`);

    const where = whereClauses.length
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

    const rows = await prisma.$queryRawUnsafe(`
      SELECT i.id, i.invoice_number, i.date, i.total_amount::float, i.status, v.name AS vendor_name
      FROM "Invoice" i
      JOIN "Vendor" v ON i."vendorId" = v.id
      ${where}
      ORDER BY i.date DESC
      LIMIT ${limit} OFFSET ${offset};
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

// ✅ /chat-with-data (proxy to Vanna)
app.post("/chat-with-data", async (req, res) => {
  const { prompt, max_rows } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "prompt is required" });

  try {
    const VANNA_URL = process.env.VANNA_API_BASE_URL;
    const VANNA_KEY = process.env.VANNA_API_KEY;

    const resp = await fetch(`${VANNA_URL.replace(/\/$/, "")}/generate-sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(VANNA_KEY ? { Authorization: `Bearer ${VANNA_KEY}` } : {}),
      },
      body: JSON.stringify({ prompt, max_rows: max_rows || 200 }),
    });

    const json = await resp.json();
    return res.json(json);
  } catch (err) {
    console.error("Vanna proxy error:", err);
    res.status(500).json({ error: "vanna error", details: String(err) });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API server listening on ${PORT}`));
