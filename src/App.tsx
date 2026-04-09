/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { Toaster } from './components/ui/sonner';
import { AlertCircle } from 'lucide-react';

function AppContent() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  return session ? <Dashboard /> : <Login />;
}

export default function App() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-xl shadow-sm border border-red-100">
          <div className="flex items-center gap-3 mb-4 text-red-600">
            <AlertCircle className="h-6 w-6" />
            <h2 className="text-xl font-semibold">Missing Configuration</h2>
          </div>
          <p className="text-zinc-600 mb-6 text-sm leading-relaxed">
            Your Supabase connection details are missing. Please configure them to use the application.
          </p>
          <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-100 mb-6">
            <ol className="list-decimal list-inside space-y-3 text-sm text-zinc-700">
              <li>Open the <strong>Settings</strong> menu in AI Studio.</li>
              <li>Go to the <strong>Secrets</strong> section.</li>
              <li>Add <code className="bg-zinc-200 px-1.5 py-0.5 rounded text-xs">VITE_SUPABASE_URL</code></li>
              <li>Add <code className="bg-zinc-200 px-1.5 py-0.5 rounded text-xs">VITE_SUPABASE_ANON_KEY</code></li>
            </ol>
          </div>
          <p className="text-xs text-zinc-500 text-center">
            The app will automatically reload once configured.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <AppContent />
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}
