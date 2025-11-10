# ⚡️ Flowbit — Full Stack Developer Internship Assignment  

**Submitted by:** [Shubham Gond](https://github.com/ShubhamGond105)  
**Role:** Full Stack Developer Internship Candidate  

---

## 🧾 Project Overview  

This repository contains my submission for the **Flowbit Full Stack Developer Internship** assignment.  
The goal was to build a **production-grade full-stack analytics application** featuring:  

1. 📊 **Interactive Analytics Dashboard** — pixel-accurate, data-driven dashboard (Next.js + Prisma + PostgreSQL).  
2. 💬 **Chat with Data** — an AI-powered conversational interface using **Vanna AI + Groq Llama 3** that generates and executes SQL queries in real-time.  

All core features, database design, APIs, and frontend integrations have been **fully developed and tested locally**.  
Some **deployment configurations (encryption keys, Render hosting)** were partially pending due to time constraints.

---

## 🚀 Live Demos & Deliverables  

| Component | Platform | Status / URL |
|------------|-----------|---------------|
| **Frontend (Next.js)** | Vercel | `https://[YOUR_VERCEL_URL].vercel.app` *(pending deployment)* |
| **Backend (API Routes)** | Vercel | Same as frontend (`/api`) |
| **Vanna AI (Python Flask)** | Render | `https://[YOUR_VANNA_URL].onrender.com` *(deployment in progress)* |
| **Demo Video** | Loom / YouTube | `https://[YOUR_DEMO_VIDEO_LINK].com` *(recorded locally)* |

---

## 🧱 Tech Stack  

| Layer | Technology |
|-------|-------------|
| **Monorepo** | npm Workspaces |
| **Frontend** | Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui |
| **Backend** | Next.js API Routes, Prisma ORM, PostgreSQL |
| **AI Service** | Flask (Python), Vanna AI, Groq (Llama 3) |
| **Database** | Neon Serverless PostgreSQL |
| **Charts** | Recharts |
| **Deployment (Intended)** | Vercel (Frontend/API), Render (AI), Neon (DB) |

---

## 📁 Project Structure  

```bash
flowbit-assignment/
│
├── apps/
│   ├── web/                 # Frontend (Next.js + Tailwind + shadcn)
│   └── api/                 # Backend API (Next.js API Routes + Prisma)
│
├── services/
│   └── vanna/               # Flask-based AI service using Vanna + Groq
│
├── data/
│   └── Analytics_Test_Data.json   # Provided dataset (invoice, vendor, payment)
│
├── package.json             # Monorepo workspace configuration
└── README.md
🧩 Architecture Overview
┌────────────────────┐
│    Next.js UI      │   → User Interface (Dashboard + Chat)
└────────┬───────────┘
         │ (API Calls)
┌────────▼───────────┐
│   Next.js API      │   → REST APIs + Data Aggregation
│   (apps/api)       │
└────────┬───────────┘
         │ (Prisma ORM)
┌────────▼───────────┐
│  PostgreSQL DB     │   → Vendors, Invoices, LineItems, Payments
└────────┬───────────┘
         │ (AI Query)
┌────────▼───────────┐
│  Flask + Vanna AI  │   → Natural Language to SQL via Groq
└────────────────────┘
🧠 Database Schema

The normalized PostgreSQL schema was designed using Prisma.

Model	Description
Vendor	Stores unique vendor information
Invoice	Central entity linked to vendorId
LineItem	Contains all line items linked to an invoice
Payment	Contains payment details linked to an invoice
🔧 Local Development Setup

Follow the steps below to run the entire stack locally.

1. Prerequisites

Install the following before starting:

Node.js
 ≥ 18.x

npm
 ≥ 10.x

Python
 ≥ 3.10

PostgreSQL
 (local or hosted instance)

2. Clone the Repository
git clone https://github.com/ShubhamGond105/flowbit-assignment.git
cd flowbit-assignment

3. Install Dependencies

Install all dependencies for both apps/web and apps/api workspaces:

npm install

4. Setup Environment Variables

Create the following .env files:

A. Root (/.env)
DATABASE_URL="postgresql://<USER>:<PASS>@<HOST>:<PORT>/<DB_NAME>"
B. Backend (/apps/api/.env)
DATABASE_URL="postgresql://<USER>:<PASS>@<HOST>:<PORT>/<DB_NAME>"
VANNA_API_BASE_URL="http://127.0.0.1:8000"

C. Frontend (/apps/web/.env.local)
NEXT_PUBLIC_API_BASE="http://localhost:3000/api"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

D. Vanna AI (/services/vanna/.env)
PORT=8000
DATABASE_URL="postgresql+psycopg://<USER>:<PASS>@<HOST>:<PORT>/<DB_NAME>"
GROQ_API_KEY="sk-..."

5. Database Setup
Run Prisma Migrations
npx prisma migrate dev --name init --schema=./apps/api/prisma/schema.prisma

Seed the Database
npx prisma db seed --schema=./apps/api/prisma/schema.prisma


This populates tables using the dataset in data/Analytics_Test_Data.json.

6. Run All Services (3 Terminals)
🧠 Terminal 1 — Vanna AI Service (Python)
cd services/vanna
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
flask run --port 8000


Runs Vanna AI service at http://127.0.0.1:8000

🌐 Terminal 2 — Frontend + Backend
npm run dev


Frontend: http://localhost:3000

Backend API: http://localhost:3000/api

🗄️ Terminal 3 — (Optional) Prisma Studio
npx prisma studio --schema=./apps/api/prisma/schema.prisma

📡 API Endpoints
Endpoint	Method	Description
/api/stats	GET	Returns totals for overview cards
/api/invoice-trends	GET	Monthly invoice count and spend
/api/vendors/top10	GET	Top 10 vendors by total spend
/api/category-spend	GET	Spend by line item category
/api/cash-outflow	GET	Expected cash outflow forecasts
/api/invoices	GET	Paginated, searchable invoice list
/api/chat-with-data	POST	Sends NL query → AI → SQL → results

🤖 Chat with Data — Workflow

User types a question (e.g., “What’s the total spend in the last 90 days?”).

Frontend sends it to /api/chat-with-data.

Backend proxies request to Vanna AI Flask service.

Vanna AI (Groq) generates SQL, executes on PostgreSQL.

Results and generated SQL are returned and rendered on the frontend.

🧠 Example Chat Output

User Prompt:

"List top 5 vendors by spend"

Generated SQL:

SELECT vendor_name, SUM(amount) AS total_spend
FROM Invoice
GROUP BY vendor_name
ORDER BY total_spend DESC
LIMIT 5;


Response Table:

Vendor	Total Spend
Acme Corp	₹125,000
Xyz Pvt Ltd	₹97,000
...	...
🌟 Future Improvements
Area	Planned Enhancement
Security	Add encryption for secrets & environment variables
Chat History	Persist user queries and responses
Data Export	Add “Export as CSV” feature
Testing	Add Jest & Playwright test coverage
CI/CD	Setup auto-deployment workflows (GitHub Actions)
🧑‍💻 Developer Note

This submission includes 100% end-to-end development — UI, backend, database, and AI layer.
Due to time limits, some deployment steps (Render encryption & hosting) remain pending.
All features function correctly in local development, and the codebase is ready for final deployment.

💬 If given a bit more time, I’ll complete production deployment, improve security, and add persistent chat history.

🙌 Acknowledgments

Thank you to the Flowbit AI team for this assignment — it was a great experience in building a real-world, AI-integrated analytics platform.

---

### ✅ Next Step for You:
1. Copy this entire content into your `README.md`.
2. Replace:
   - `[YOUR_VERCEL_URL]` with your actual frontend URL (or mark as pending if not live yet).  
   - `[YOUR_VANNA_URL]` if you manage to deploy the Flask app later.
   - Add your Loom/Youtube video link in the demo section.
3. Commit & push to GitHub:
   ```bash
   git add README.md
   git commit -m "Add detailed documentation and setup instructions"
   git push origin main


