import { useState, useEffect } from "react";
import Head from "next/head";
import AuthForm from "@/components/AuthForm";

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
          <div className="container mx-auto">
            {/* Empire Dashboard Placeholder */}
            <div className="text-center">
              <h1 className="text-4xl font-bold text-empire-gold mb-8">
                🏛️ Your Empire
              </h1>
              
              <div className="card mb-6">
                <h2 className="text-2xl font-semibold mb-4">Welcome, Caesar!</h2>
                <p className="text-stone-300 mb-6">
                  Your empire is growing. Your governors are managing the provinces while you make the strategic decisions.
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div className="card">
                    <div className="text-resource-gold text-2xl font-bold">500</div>
                    <div className="text-sm text-stone-400">Gold</div>
                  </div>
                  <div className="card">
                    <div className="text-resource-food text-2xl font-bold">1,000</div>
                    <div className="text-sm text-stone-400">Food</div>
                  </div>
                  <div className="card">
                    <div className="text-resource-stone text-2xl font-bold">300</div>
                    <div className="text-sm text-stone-400">Stone</div>
                  </div>
                  <div className="card">
                    <div className="text-resource-iron text-2xl font-bold">200</div>
                    <div className="text-sm text-stone-400">Iron</div>
                  </div>
                  <div className="card">
                    <div className="text-resource-population text-2xl font-bold">50</div>
                    <div className="text-sm text-stone-400">Population</div>
                  </div>
                  <div className="card">
                    <div className="text-resource-influence text-2xl font-bold">25</div>
                    <div className="text-sm text-stone-400">Influence</div>
                  </div>
                </div>

                <div className="bg-stone-700 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold mb-2">📡 Governor Report</h3>
                  <p className="text-sm text-stone-300">
                    <strong>Marcus Aurelius (Conservative)</strong>: Production increased by 15%. 
                    Suggests building more farms. Loyalty: 75%
                  </p>
                </div>

                <button
                  onClick={handleLogout}
                  className="btn-secondary"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}