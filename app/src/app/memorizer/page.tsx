"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Loader2, AlertTriangle, ChevronLeft } from "lucide-react";
import Link from "next/link";
import MemorizerCard from "@/components/MemorizerCard"; // Use the new component

// This is the full Location type that MemorizerCard expects
interface Location {
  id: number;
  pano_id: string;
  map_id: string;
  country: string;
  country_code: string | null;
  meta_name: string | null;
  note: string | null;
  footer: string | null;
  images: string[];
  raw_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export default function MemorizerPage() {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ new: number; review: number; lapsed: number } | null>(null);

  const fetchNextCard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const memorizerRes = await fetch("/api/memorizer");
      const memorizerData = await memorizerRes.json();

      if (!memorizerRes.ok || !memorizerData.success) {
        throw new Error(memorizerData.message || "Could not get next card.");
      }
      const { locationId, stats: newStats } = memorizerData;
      setStats(newStats);

      const metaRes = await fetch(`/api/meta/${locationId}`);
      const metaData = await metaRes.json();

      if (!metaRes.ok || !metaData.success) {
        throw new Error(metaData.message || "Could not load location data.");
      }

      setLocation(metaData.location);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNextCard();
  }, [fetchNextCard]);

  const handleUpdateProgress = async (quality: number) => {
    if (!location) return;
    try {
      await fetch("/api/memorizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: location.id, quality }),
      });
    } catch (error) {
      console.error("Failed to update progress:", error);
    } finally {
      fetchNextCard();
    }
  };

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
            <Button onClick={() => handleUpdateProgress(1)} variant="destructive" className="w-full sm:w-32 h-12 text-lg font-semibold">
              Hard
            </Button>
            <Button onClick={() => handleUpdateProgress(3)} variant="secondary" className="w-full sm:w-32 h-12 text-lg font-semibold">
              Good
            </Button>
            <Button onClick={() => handleUpdateProgress(5)} className="bg-green-600 hover:bg-green-700 w-full sm:w-32 h-12 text-lg font-semibold">
              Easy
            </Button>
          </div>
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
            <div className="w-10 sm:w-36 text-right">
              {stats && !loading && (
                <span className="text-xs sm:text-sm text-slate-500">
              {stats.new} new, {stats.review} reviews, {stats.lapsed} lapsed
            </span>
          )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="w-full flex-grow flex items-center justify-center">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

