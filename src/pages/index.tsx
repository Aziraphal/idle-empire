import { useState, useEffect } from "react";
import Head from "next/head";
import AuthForm from "@/components/AuthForm";
import EmpireDashboard from "@/components/EmpireDashboard";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth-token");
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  const handleAuthSuccess = (token: string) => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("auth-token");
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-empire-gold text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Idle Empire - Build Your Legacy</title>
        <meta name="description" content="Modern idle empire builder with AI governors" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen py-12 px-4">
        {!isAuthenticated ? (
          <div className="container mx-auto max-w-lg">
            <AuthForm onSuccess={handleAuthSuccess} />
          </div>
        ) : (
          <EmpireDashboard onLogout={handleLogout} />
        )}
      </main>
    </>
  );
}