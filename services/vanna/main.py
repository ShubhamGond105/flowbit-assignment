# services/vanna/main.py
import os
import re
import json
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse

from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx
import psycopg # Use the new psycopg (v3)

load_dotenv()  # loads .env in the same folder if present

DATABASE_URL = os.getenv("DATABASE_URL")
GROQ_API_URL = os.getenv("GROQ_API_URL")  # optional
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
VANNA_API_KEY = os.getenv("VANNA_API_KEY", "")
DEFAULT_MAX_ROWS = int(os.getenv("DEFAULT_MAX_ROWS", "200"))
PORT = int(os.getenv("PORT", "8000"))

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required in environment")

app = FastAPI(title="Vanna AI (SQL generator & executor)")

# Simple request model
class NLRequest(BaseModel):
    prompt: str
    max_rows: Optional[int] = DEFAULT_MAX_ROWS

# Response model
class SQLResponse(BaseModel):
    sql: str
    rows: List[Dict[str, Any]] = []
    meta: Optional[Dict[str, Any]] = None

# Safety checks for SQL before execution
def is_safe_select(sql: str) -> bool:
    s = sql.strip().lower()
    if not s.startswith("select"):
        return False
    # deny multiple statements
    if ";" in s and s.strip().count(";") > 1:
        return False
    # disallow dangerous keywords
    forbidden = [
        "insert ", "update ", "delete ", "drop ", "truncate ",
        "create ", "alter ", "grant ", "revoke ", "copy "
    ]
    for k in forbidden:
        if k in s:
            return False
    return True

# Basic fallback SQL generator (very simple) when no LLM configured
def fallback_generate_sql(prompt: str) -> str:
    prompt_low = prompt.lower()
    if "total spend" in prompt_low or "sum" in prompt_low or "total" in prompt_low:
        return "SELECT SUM(total_amount) AS total_spend FROM \"Invoice\";"
    if "top" in prompt_low and "vendor" in prompt_low:
        return (
            "SELECT v.name AS vendor, SUM(i.total_amount)::float AS spend "
            "FROM \"Invoice\" i JOIN \"Vendor\" v ON i.\"vendorId\"=v.id "
            "GROUP BY v.name ORDER BY spend DESC LIMIT 10;"
        )
    if "overdue" in prompt_low or "over due" in prompt_low:
        return (
            "SELECT i.invoice_number, i.date, i.due_date, i.total_amount, i.status "
            "FROM \"Invoice\" i WHERE i.status != 'paid' AND COALESCE(i.due_date, i.date) < now()::date "
            "ORDER BY i.due_date ASC LIMIT 200;"
        )
    # fallback generic
    return "SELECT id FROM \"Invoice\" LIMIT 10;"

# Optionally call Groq (or other LLM) to generate SQL.
async def call_groq(prompt: str) -> Optional[str]:
    if not GROQ_API_URL or not GROQ_API_KEY:
        return None
    
    # Use the /chat/completions payload format
    payload = {
        "model": "llama3-8b-8192", # Or any model you prefer
        "messages": [
            {
                "role": "system",
                "content": "You are a SQL generator. Translate the user's request into a single, safe SQL SELECT query for PostgreSQL. Do not add any explanation or markdown."
            },
            {
                "role": "user",
                "content": f"Tables: Invoice, Vendor, LineItem, Payment, Document. Request: {prompt}"
            }
        ],
        "max_tokens": 512,
        "temperature": 0.0,
    }
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(GROQ_API_URL, json=payload, headers=headers)
        
        if r.status_code != 200:
            print("Groq error:", r.status_code, r.text)
            return None
        
        resp = r.json()
        text = None
        
        # Correct way to parse Groq chat/completions response
        if isinstance(resp, dict):
            choices = resp.get("choices")
            if choices and len(choices) > 0 and choices[0].get("message"):
                text = choices[0]["message"].get("content")

        if not text:
            print("Groq response format not recognized:", json.dumps(resp))
            return None

        # crude extraction: find first SELECT...
        m = re.search(r"(select[\s\S]*)", text, re.IGNORECASE)
        if m:
            candidate = m.group(1).strip()
            candidate = re.sub(r"^```sql\s*", "", candidate, flags=re.IGNORECASE)
            candidate = re.sub(r"```$", "", candidate)
            candidate = candidate.split(";")[0] + ";"
            return candidate
            
    except httpx.RequestError as e:
        print(f"HTTPX error calling Groq: {e}")
        return None
        
    return None

# ---------- CORRECTED normalize_db_url ----------
def normalize_db_url(db_url: str) -> Tuple[str, Optional[str]]:
    """
    Parses the DB URL, extracts a 'schema' or 'search_path' from the query,
    and returns a tuple of (cleaned_url, search_path_value).
    """
    if not db_url:
        return db_url, None

    p = urlparse(db_url)
    if not p.query:
        return db_url, None

    # Parse the query string
    qs = dict(parse_qsl(p.query, keep_blank_values=True))

    # Find, store, and remove 'schema' or 'search_path'
    search_path_val = None
    if 'schema' in qs:
        search_path_val = qs.pop('schema')
    elif 'search_path' in qs:
        search_path_val = qs.pop('search_path')

    # Rebuild URL with the cleaned query string
    new_query = urlencode(list(qs.items()))
    new_url = urlunparse((p.scheme, p.netloc, p.path, p.params, new_query, p.fragment))
    
    return new_url, search_path_val

# ---------- CORRECTED execute_sql ----------
async def execute_sql(sql: str, max_rows: int = DEFAULT_MAX_ROWS):
    """
    Validate SQL, ensure LIMIT, normalize DB URL, execute read-only and return list[dict].
    """
    if not is_safe_select(sql):
        raise HTTPException(status_code=400, detail="Generated SQL is not a safe SELECT statement.")

    # Ensure LIMIT
    s = sql.strip()
    if not re.search(r"\blimit\b", s, re.IGNORECASE):
        s = s.rstrip(";") + f" LIMIT {max_rows};"

    # Normalize DB URL and extract search_path
    cleaned_url, search_path = normalize_db_url(DATABASE_URL)

    # Build connection params.
    conn_params = {
        "conninfo": cleaned_url
    }
    if search_path:
        # Pass the search_path as a libpq 'options' command-line argument.
        # This is the correct way to set it at connection time.
        conn_params["options"] = f"-c search_path={search_path}"

    conn: Optional[psycopg.AsyncConnection] = None
    try:
        # connect async using normalized URL and passing options as kwarg
        conn = await psycopg.AsyncConnection.connect(**conn_params)
        
        # enforce read-only at transaction level
        await conn.execute("SET LOCAL transaction_read_only = true;")
        async with conn.cursor() as cur:
            await cur.execute(s)
            rows = await cur.fetchall()
            cols = [col.name for col in (cur.description or [])]
            result = [dict(zip(cols, row)) for row in rows]
            return result
    except Exception as e:
        # Catch specific psycopg connection errors
        print(f"Database Error: {e}")
        # Re-raise as HTTPException for the client
        raise HTTPException(status_code=500, detail=f"sql execution error: {str(e)}")
    finally:
        if conn:
            await conn.close()


@app.post("/nl-to-sql", response_model=SQLResponse)
async def nl_to_sql(req: NLRequest, authorization: Optional[str] = Header(None)):
    # simple API key check
    if VANNA_API_KEY:
        if not authorization or not authorization.lower().startswith("bearer "):
            raise HTTPException(status_code=401, detail="missing authorization")
        token = authorization.split(" ", 1)[1].strip()
        if token != VANNA_API_KEY:
            raise HTTPException(status_code=403, detail="invalid token")

    prompt = req.prompt
    max_rows = min(req.max_rows or DEFAULT_MAX_ROWS, DEFAULT_MAX_ROWS)

    # Try LLM first (if configured)
    sql_candidate = await call_groq(prompt)
    if not sql_candidate:
        print("LLM failed, using fallback SQL generator.")
        sql_candidate = fallback_generate_sql(prompt)

    # validation & execute
    try:
        rows = await execute_sql(sql_candidate, max_rows=max_rows)
    except HTTPException as e:
        # Re-raise HTTP exceptions from execute_sql
        raise e
    except Exception as e:
        # This will catch any other unexpected errors
        print(f"Unhandled error in nl_to_sql: {e}")
        raise HTTPException(status_code=500, detail=f"sql execution error: {str(e)}")

    return {"sql": sql_candidate, "rows": rows, "meta": {"rows_returned": len(rows)}}

# Also expose /generate-sql alias if your frontend expects it
@app.post("/generate-sql", response_model=SQLResponse)
async def generate_sql(req: NLRequest, authorization: Optional[str] = Header(None)):
    return await nl_to_sql(req, authorization)

# health check
@app.get("/health")
async def health():
    return {"status": "ok"}

# simple root
@app.get("/")
async def root():
    return {"service": "vanna", "healthy": True}