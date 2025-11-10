// apps/web/components/InvoicesTable.tsx
'use client';
import React, { useEffect, useState } from "react";

export default function InvoicesTable({ initialRows = [] }: { initialRows?: any[] }) {
  const [rows, setRows] = useState(initialRows);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  async function load(p = page, query = q) {
    setLoading(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'}/invoices?limit=${limit}&offset=${p*limit}${query ? `&q=${encodeURIComponent(query)}` : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      // json { data, total, offset, limit } per our API
      setRows(json.data || []);
      setTotal(json.total ?? null);
    } catch (err) {
      console.error('invoices load err', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(0, ''); }, []);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search vendor or invoice #" className="border p-2 rounded text-sm" />
        <button onClick={() => { setPage(0); load(0, q); }} className="px-3 py-1 bg-blue-600 text-white rounded">Search</button>
        <div className="ml-auto text-sm text-gray-600">{loading ? 'Loading...' : total !== null ? `${total} results` : ''}</div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-100">
            <tr>
              <th className="text-left py-2 px-2 font-medium text-xs">Vendor</th>
              <th className="text-left py-2 px-2 font-medium text-xs">Date</th>
              <th className="text-left py-2 px-2 font-medium text-xs">Invoice #</th>
              <th className="text-right py-2 px-2 font-medium text-xs">Amount</th>
              <th className="text-left py-2 px-2 font-medium text-xs">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r:any, idx:number) => (
              <tr key={r.id ?? idx} className="border-t border-gray-200">
                <td className="py-2 px-2 text-gray-700">{r.vendor_name ?? r.vendor?.name ?? '—'}</td>
                <td className="py-2 px-2 text-gray-600">{r.date ? new Date(r.date).toLocaleDateString() : '—'}</td>
                <td className="py-2 px-2 text-gray-700">{r.invoiceNumber ?? r.invoice_number ?? '—'}</td>
                <td className="py-2 px-2 text-gray-700 text-right">{Number(r.totalAmount || r.total_amount || 0).toLocaleString()}</td>
                <td className="py-2 px-2 text-gray-700">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 justify-between mt-3">
        <div>
          <button onClick={() => { const np = Math.max(0, page-1); setPage(np); load(np, q); }} disabled={page===0} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
          <button onClick={() => { const np = page+1; setPage(np); load(np, q); }} className="px-3 py-1 border rounded ml-2">Next</button>
        </div>
        <div className="text-sm text-gray-600">Page {page + 1}{ total ? ` • ${total} total` : '' }</div>
      </div>
    </div>
  );
}
