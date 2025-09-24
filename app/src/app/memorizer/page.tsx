"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MultiSelectComboBox } from "@/components/ui/multi-select-combobox";
import {
  BrainCircuit,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/config";
import MemorizerCard, { Location } from "@/components/MemorizerCard.tsx"; // Use the new component

export default function MemorizerPage() {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [
    stats,
    setStats,
  ] = useState<
    | {
        new: number;
        review: number;
        lapsed: number;
        newTotal: number;
        reviewTotal: number;
        lapsedTotal: number;
      }
    | null
  >(null);

  const [countries, setCountries] = useState<string[]>([]);
  const [continents, setContinents] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedContinents, setSelectedContinents] = useState<string[]>([]);

  const fetchNextCard = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUpdateError(null);

    try {
      const params = new URLSearchParams();
      if (selectedCountries.length) {
        params.set("country", selectedCountries.join(","));
      }
      if (selectedContinents.length) {
        params.set("continent", selectedContinents.join(","));
      }
      const query = params.toString();
      const memorizerRes = await fetch(
        `/api/memorizer${query ? `?${query}` : ""}`,
      );
      const memorizerData = await memorizerRes.json();

      if (!memorizerRes.ok || !memorizerData.success) {
        throw new Error(memorizerData.message || "Could not get next card.");
      }
      const {
        location: newLocation,
        stats: newStats,
        countries: apiCountries,
        continents: apiContinents,
      } = memorizerData;
      setStats(newStats);
      setLocation(newLocation);
      if (apiCountries) setCountries(apiCountries);
      if (apiContinents) setContinents(apiContinents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, [selectedCountries, selectedContinents]);

  useEffect(() => {
    fetchNextCard();
  }, [fetchNextCard]);

  const handleCountryChange = (values: string[]) => {
    setSelectedCountries(values);
  };

  const handleContinentChange = (values: string[]) => {
    setSelectedContinents(values);
  };

  const handleUpdateProgress = useCallback(
    async (quality: number) => {
      if (!location) return;
      setUpdateError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/memorizer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locationId: location.id, quality }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to update progress.");
        }
        fetchNextCard();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        setUpdateError(message);
        console.error("Failed to update progress:", error);
      }
    },
    [fetchNextCard, location]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "1":
        case "ArrowLeft":
          handleUpdateProgress(0);
          break;
        case "2":
        case "ArrowDown":
          handleUpdateProgress(2);
          break;
        case "3":
        case "ArrowUp":
          handleUpdateProgress(3);
          break;
        case "4":
        case "ArrowRight":
          handleUpdateProgress(5);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUpdateProgress]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center text-center h-96">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
          <p className="mt-4 text-slate-300">Finding the next card for you...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center text-center text-red-400 h-96">
          <AlertTriangle className="w-12 h-12 mb-4" />
          <h3 className="text-xl font-semibold text-white">An Error Occurred</h3>
          <p className="text-red-400">{error}</p>
          <Button onClick={fetchNextCard} variant="outline" className="mt-6 bg-slate-700 border-slate-600 hover:bg-slate-600">
            Try Again
          </Button>
        </div>
      );
    }

    if (!location) {
      return (
        <div className="flex flex-col items-center justify-center text-center h-96">
          <h3 className="text-xl font-semibold text-white">All Done!</h3>
          <p className="text-slate-300">You&apos;ve reviewed all available cards for now.</p>
        </div>
      );
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={location.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="w-full flex flex-col items-center"
        >
          {/* Use the new, larger MemorizerCard */}
          <div className="w-full">
            <MemorizerCard location={location} />
          </div>

          {/* Review Buttons */}
          <div className="mt-8 flex-shrink-0 w-full max-w-lg flex flex-col sm:flex-row justify-around items-center gap-4">
            <Button
              onClick={() => handleUpdateProgress(0)}
              variant="destructive"
              className="w-full sm:w-32 h-12 text-lg font-semibold"
            >
              Again
            </Button>
            <Button
              onClick={() => handleUpdateProgress(2)}
              variant="secondary"
              className="w-full sm:w-32 h-12 text-lg font-semibold"
            >
              Hard
            </Button>
            <Button
              onClick={() => handleUpdateProgress(3)}
              variant="secondary"
              className="w-full sm:w-32 h-12 text-lg font-semibold"
            >
              Good
            </Button>
            <Button
              onClick={() => handleUpdateProgress(5)}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-32 h-12 text-lg font-semibold"
            >
              Easy
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-400">
            Shortcuts: 1–4 or arrow keys
          </p>
          {updateError && (
            <p className="mt-4 text-red-400">{updateError}</p>
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-4 sm:py-6 flex flex-col min-h-screen">
        {/* Header */}
        <div className="w-full flex-shrink-0">
          <div className="flex justify-between items-center mb-6 sm:mb-8">
            <div className="w-10 sm:w-36">
              <Link href="/" aria-label="Back to Gallery">
                <Button variant="outline" size="icon" className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 h-10 w-10">
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              </Link>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center justify-center text-center">
              <BrainCircuit className="h-7 w-7 mr-2" />
              <span className="hidden sm:inline">Meta Memorizer</span>
            </h1>
            <div className="w-10 sm:w-36 flex items-center justify-end gap-2 text-right">
              {stats && !loading && (
                <span className="text-xs sm:text-sm text-slate-500">
                  {stats.new}/{stats.newTotal} new, {stats.review}/{stats.reviewTotal} reviews, {stats.lapsed}/{stats.lapsedTotal} lapsed due today
                </span>
              )}
              <Link href="/stats" aria-label="Review stats">
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 h-10 w-10"
                >
                  <BarChart3 className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col sm:flex-row gap-4">
          <MultiSelectComboBox
            options={continents.map((c) => ({ value: c, label: c }))}
            selected={selectedContinents}
            onChange={handleContinentChange}
            placeholder="Filter by continent..."
            className="w-full sm:w-[220px]"
          />
          <MultiSelectComboBox
            options={countries.map((c) => ({ value: c, label: c }))}
            selected={selectedCountries}
            onChange={handleCountryChange}
            placeholder="Filter by country..."
            className="w-full sm:w-[280px]"
          />
        </div>

        {/* Main Content Area */}
        <div className="w-full flex-grow flex items-center justify-center">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

