"use client"

// --- THIS IS THE FIX ---
// Combined all React imports and Lucide imports onto single lines
import React, { useEffect, useState } from "react";
import { MoreVertical, Menu, X } from "lucide-react";

// Corrected import path
import apiFetch from "./lib/api"; 
// New formatters
import { formatCurrency, formatNumber } from "./lib/format"; 

// Component Imports
import OverviewCard from "./components/OverviewCard";
import TrendChart from "./components/TrendChart";
import VendorBarChart from "./components/VendorBarChart";
import CategoryPie from "./components/CategoryPie";
import CashOutflowChart from "./components/CashOutflowChart";
import InvoicesTable from "./components/InvoicesTable";

// Type definitions
type TrendRow = { month: string; invoice_count: number; spend: number };
type VendorRow = { id: string; name: string; spend: number };
type InvoiceRow = { id: string; invoiceNumber: string; date: string; totalAmount: number | string; status: string; vendor?: { name?: string } };
type CategoryRow = { category: string; spend: number };
type CashOutRow = { day: string; expected_outflow: number };

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [lineChartData, setLineChartData] = useState<{ month: string; value: number }[]>([]);
  const [vendorSpendData, setVendorSpendData] = useState<{ name: string; value: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; color?: string }[]>([]);
  const [forecastData, setForecastData] = useState<{ range: string; value: number }[]>([]);
  const [invoicesData, setInvoicesData] = useState<{ vendor: string; date: string; amount: string }[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Add state for sidebar

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [sRes, tRes, vRes, cRes, fRes, iRes] = await Promise.all([
          apiFetch('/stats'),
          apiFetch<TrendRow[]>('/invoice-trends'),
          apiFetch<VendorRow[]>('/vendors/top10'),
          apiFetch<CategoryRow[]>('/category-spend'),
          apiFetch<CashOutRow[]>('/cash-outflow'),
          apiFetch<{ data: InvoiceRow[]; total?: number }>('/invoices?limit=10&offset=0'),
        ]);

        if (!mounted) return;

        if (sRes.ok) setStats(sRes.data);
        if (tRes.ok) {
          const mapped = (tRes.data || []).map(r => ({ month: new Date(r.month).toISOString().slice(0,7), value: Number(r.spend || r.invoice_count || 0) }));
          setLineChartData(mapped);
        }
        if (vRes.ok) {
          setVendorSpendData((vRes.data || []).map(v => ({ name: v.name, value: Number(v.spend || 0) })));
        }
        if (cRes.ok) {
          setCategoryData((cRes.data || []).map((r, idx) => ({ name: r.category, value: Number(r.spend || 0), color: ['#3B82F6','#F59E0B','#EF5350'][idx % 3] })));
        } else {
          if (sRes.ok) setCategoryData([{ name: 'General', value: Number(sRes.data.totalSpend || 0), color: '#3B82F6' }]);
        }
        if (fRes.ok) {
          const rows = fRes.data || [];
          
          const values: Record<string, number> = {}; 

          for (const r of rows) {
            const day = new Date(r.day);
            const diff = Math.ceil((day.getTime() - Date.now()) / (1000*60*60*24));
            const key =
              diff <= 7 ? '0 - 7 days' :
              diff <= 30 ? '8 - 30 days' :
              diff <= 60 ? '31-60 days' : '60+ days';
            values[key] = (values[key] || 0) + Number(r.expected_outflow || 0);
          }
          const forecast = [
            { range: '0 - 7 days', value: values['0 - 7 days'] || 0 },
            { range: '8 - 30 days', value: values['8 - 30 days'] || 0 },
            { range: '31-60 days', value: values['31-60 days'] || 0 },
            { range: '60+ days', value: values['60+ days'] || 0 },
          ];
          setForecastData(forecast);
        }
        if (iRes.ok) {
          const rows = iRes.data?.data || iRes.data || [];
          const mappedInvs = rows.map((r: InvoiceRow) => ({
            vendor: r.vendor?.name ?? '—',
            date: new Date(r.date).toLocaleDateString(),
            amount: (Number(r.totalAmount) ? Number(r.totalAmount).toLocaleString() : String(r.totalAmount)),
          }));
          setInvoicesData(mappedInvs);
        }
      } catch (e) {
        console.error('dashboard load error', e);
      } finally {
        setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="p-6">Loading dashboard...</div>;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex-col ${isSidebarOpen ? 'flex' : 'hidden'} md:relative md:flex flex-shrink-0`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold">B</span>
            </div>
            <div>
              <h1 className="font-semibold text-sm">Buchhaltung</h1>
              <p className="text-xs text-gray-500">12 members</p>
            </div>
          </div>
           {/* Mobile close button (visible only on mobile) */}
          <button 
            className="md:hidden p-1" 
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-3">General</h2>
            <ul className="space-y-2">
              <li>
                <a
                  href="/" // Active page
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-pink-50 text-pink-600 font-medium"
                >
                  <div className="w-5 h-5">📊</div>
                  Dashboard
                </a>
              </li>
              <li>
                <a 
                  href="/chat" // Link to chat page
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  <div className="w-5 h-5">💬</div>
                  Chat
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50">
                  <div className="w-5 h-5">📄</div>
                  Invoice
                </a>
              </li>
            </ul>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded">🚀</div>
            <span className="font-semibold text-sm">Flowbit AI</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="p-6 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-4">
                {/* Mobile menu button (visible only on mobile) */}
                <button 
                  className="md:hidden p-1 -ml-2" 
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu className="w-6 h-6 text-gray-700" />
                </button>
                <h1 className="text-2xl font-semibold">Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">Amit Jadhav</p>
                <p className="text-xs text-gray-500">Admin</p>
              </div>
              <button>
                <MoreVertical className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </header>
        
        {/* Page Content - now with overflow-auto */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-lg p-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <OverviewCard 
                title="Total Spend" 
                subtitle="(YTD)" 
                value={formatCurrency(stats?.totalSpend)}
                trendText="+8.2% from last month"
                trendUp={true}
              />
              <OverviewCard 
                title="Total Invoices Processed" 
                value={formatNumber(stats?.totalInvoices)}
                trendText="+8.2% from last month"
                trendUp={true}
              />
              <OverviewCard 
                title="Documents Uploaded" 
                value={formatNumber(stats?.documentsUploaded)}
                trendText="-8 less from last month"
                trendUp={false}
              />
              <OverviewCard 
                title="This Month" 
                value="-"
                trendText="+8.2% from last month"
                trendUp={true}
              />
              <OverviewCard 
                title="Average Invoice Value" 
                value={formatCurrency(stats?.avgInvoiceValue)}
                trendText="+8.2% from last month"
                trendUp={true}
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-1">Invoice Volume + Value Trend</h3>
                <p className="text-xs text-gray-500 mb-4">Invoice count and total spend over time.</p>
                <TrendChart data={lineChartData} />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-1">Spend by Vendor (Top 10)</h3>
                <p className="text-xs text-gray-500 mb-4">Vendor spend with cumulative percentage distribution.</p>
                <VendorBarChart data={vendorSpendData} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-1">Spend by Category</h3>
                <p className="text-xs text-gray-500 mb-4">Distribution of spending across different categories.</p>
                <CategoryPie data={categoryData} />
                <div className="mt-4 space-y-2 text-sm">
                  {categoryData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span>{item.name}</span>
                      </div>
                      <span className="font-semibold">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-1">Cash Outflow Forecast</h3>
                <p className="text-xs text-gray-500 mb-4">Expected payment obligations grouped by due date ranges.</p>
                <CashOutflowChart data={forecastData} />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-1">Invoices by Vendor</h3>
                <p className="text-xs text-gray-500 mb-4">Top vendors by invoice count and net value.</p>
                <InvoicesTable initialRows={invoicesData} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}