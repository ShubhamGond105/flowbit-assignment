from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os, psycopg2, json

app = FastAPI()
DATABASE_URL = os.getenv("PSYCOPG_DATABASE_URL") or os.getenv("DATABASE_URL")

class In(BaseModel):
    prompt: str
    max_rows: int = 200

def call_groq_stub(prompt: str) -> str:
    # naive mapping for common queries — replace with real LLM/Groq call later
    if "top 5 vendors" in prompt.lower(): 
        return 'SELECT v.name, SUM(i.total_amount)::float as spend FROM "Vendor" v JOIN "Invoice" i ON i."vendorId"=v.id GROUP BY v.name ORDER BY spend DESC LIMIT 5;'
    if "total spend" in prompt.lower():
        return 'SELECT SUM(total_amount)::float as total_spend FROM "Invoice";'
    return 'SELECT id FROM "Invoice" LIMIT 10;'

def run_sql(sql, max_rows=200):
    if any(x in sql.lower() for x in ["delete ", "drop ", "alter ", "truncate ", "update ", "insert "]):
        raise Exception("Destructive SQL not allowed.")
    if "limit" not in sql.lower():
        sql = sql.rstrip(";") + f" LIMIT {max_rows};"
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute(sql)
    cols = [d[0] for d in cur.description] if cur.description else []
    rows = cur.fetchmany(max_rows)
    cur.close(); conn.close()
    return {"cols": cols, "rows": rows}

@app.post("/generate-sql")
def generate_sql(payload: In):
    try:
        sql = call_groq_stub(payload.prompt)
        res = run_sql(sql, payload.max_rows)
        return {"sql": sql, "results": {"columns": res["cols"], "rows": res["rows"]}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
