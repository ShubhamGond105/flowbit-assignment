"use client"

import ChatBox from "../components/ChatBox";
import { MoreVertical, Menu, X } from "lucide-react"; // Import Menu and X icons
import { useState } from "react"; // Import useState

export default function ChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* --- Sidebar --- */}
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
                  href="/" // Link back to Dashboard
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  <div className="w-5 h-5">📊</div>
                  Dashboard
                </a>
              </li>
              <li>
                <a
                  href="/chat" // Active page
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-pink-50 text-pink-600 font-medium"
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

      {/* --- Main Content --- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="p-3.5 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile menu button (visible only on mobile) */}
              <button 
                className="md:hidden p-1 -ml-2" 
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
              <h1 className="text-2xl font-semibold">Chat With Data</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
              <div className="hidden sm:block"> {/* Hide user name on extra-small screens */}
                <p className="text-sm font-medium">Amit Jadhav</p>
                <p className="text-xs text-gray-500">Admin</p>
              </div>
              <button>
                <MoreVertical className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </header>

        {/* --- THIS IS THE FIX ---
          - `overflow-auto` is changed to `overflow-hidden` (removes outer scrollbar).
          - `p-4 md:p-6` is REMOVED (the ChatBox component now handles its own padding).
        */}
        <main className="flex-1 overflow-hidden">
          <ChatBox />
        </main>
      </div>
    </div>
  );
}