"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestTokenPage() {
  const { user, isAuthenticated, logout, checkAuth } = useAuth();

  const handleTestToken = async () => {
    try {
      const isValid = await checkAuth();
      alert(`Token is ${isValid ? "valid" : "invalid"}`);
    } catch (error) {
      alert("Error checking token: " + error);
    }
  };

  const handleForceLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Token Expiration Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p>
                <strong>Authentication Status:</strong>{" "}
                {isAuthenticated ? "Authenticated" : "Not Authenticated"}
              </p>
              {user && (
                <div className="space-y-1">
                  <p>
                    <strong>User:</strong> {user.fullName}
                  </p>
                  <p>
                    <strong>Role:</strong> {user.role}
                  </p>
                  <p>
                    <strong>Email:</strong> {user.email}
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-4">
              <Button onClick={handleTestToken}>Test Token Validity</Button>
              <Button onClick={handleForceLogout} variant="destructive">
                Force Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
