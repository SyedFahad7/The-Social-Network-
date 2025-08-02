"use client";

import { Loader2 } from "lucide-react";

export function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Checking authentication...
        </p>
      </div>
    </div>
  );
}

export function TokenExpiredMessage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-4 max-w-md text-center">
        <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-xl font-semibold">Session Expired</h2>
        <p className="text-sm text-muted-foreground">
          Your session has expired. Please log in again to continue.
        </p>
        <button
          onClick={() => (window.location.href = "/auth/login")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Go to Login
        </button>
      </div>
    </div>
  );
}
