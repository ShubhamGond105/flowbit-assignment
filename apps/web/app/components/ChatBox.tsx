"use client";

import React, { useState } from 'react';
import apiFetch from '../lib/api'; // Make sure this path is correct

// Import shadcn/ui components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send } from 'lucide-react';

// Define the structure of a message
type Message = {
  id: string;
  sender: 'user' | 'bot';
  text?: string;
  sql?: string;
  rows?: Record<string, any>[];
};

export default function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Send the prompt to your Node.js API
      const res = await apiFetch('/chat-with-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input }),
      });

      if (!res.ok) {
        throw new Error(res.data.error || 'An error occurred');
      }

      const { sql, rows } = res.data;

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        sql: sql,
        rows: rows,
      };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      const err = error as Error;
      const errorMessage: Message = {
        id: `bot-error-${Date.now()}`,
        sender: 'bot',
        text: `Error: ${err.message}`,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // --- THIS IS FIX #1 ---
    // Changed h-[calc(100vh-10rem)] to h-full
    // This makes the chatbox fill its parent <main> tag, not the whole screen
    <div className="flex flex-col h-full bg-white rounded-lg border">
      
      {/* Message display area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
              {msg.sender === 'bot' && (
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-gray-600" />
                </span>
              )}
              <div className={`p-3 rounded-lg max-w-xl ${
                msg.sender === 'user'
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {/* User's text message */}
                {msg.text && <p>{msg.text}</p>}

                {/* Bot's SQL response */}
                {msg.sql && (
                  <div className="mt-2">
                    <p className="text-sm font-medium mb-1">Generated SQL:</p>
                    <pre className="text-xs bg-gray-800 text-white p-2 rounded-md overflow-x-auto">
                      <code>{msg.sql}</code>
                    </pre>
                  </div>
                )}

                {/* Bot's data table response */}
                {msg.rows && msg.rows.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Results:</p>
                    <DataTable data={msg.rows} />
                  </div>
                )}
                {msg.rows && msg.rows.length === 0 && (
                  <p className="text-sm italic mt-2">Query returned no results.</p>
                )}
              </div>
              {msg.sender === 'user' && (
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-700" />
                </span>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Bot className="w-5 h-5 text-gray-600" />
              </span>
              <div className="p-3 rounded-lg bg-gray-100 text-gray-500">
                Thinking...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t bg-white rounded-b-lg">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What’s the total spend in the last 90 days?"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

// --- THIS IS FIX #3 (Formats JSON nicely) ---
// Helper to format individual cells
function DataCell({ value }: { value: any }) {
  // 1. Handle null/undefined
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">NULL</span>;
  }
  
  // 2. Handle objects (like Dates)
  // This now checks for common date string formats
  if (typeof value === 'object' || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/))) {
    try {
      // Try to format as a locale date/time
      return new Date(value).toLocaleString();
    } catch (e) {
      // Fallback for complex objects
      return <pre className="text-xs bg-gray-200 p-1 rounded">{JSON.stringify(value)}</pre>;
    }
  }

  // 3. Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'True' : 'False';
  }

  // 4. Default: convert to string
  return String(value);
}

// --- THIS IS FIX #2 (Removes nested scrollbar) ---
function DataTable({ data }: { data: Record<string, any>[] }) {
  if (!data || data.length === 0) return null;

  const headers = Object.keys(data[0]);

  return (
    // Removed max-h-60 and overflow-auto to stop internal scrolling.
    // Added overflow-x-auto to allow horizontal scrolling for wide tables.
    <div className="overflow-x-auto rounded-lg border relative">
      <Table className="bg-white min-w-full">
        <TableHeader className="sticky top-0 bg-gray-50">
          <TableRow>
            {headers.map(header => (
              <TableHead key={header} className="text-gray-700">{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {headers.map(header => (
                <TableCell key={`${rowIndex}-${header}`} className="text-sm">
                  {/* Use the new DataCell helper */}
                  <DataCell value={row[header]} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}