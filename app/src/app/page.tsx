"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, RefreshCw, MapPin, Database, Globe, BrainCircuit } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  MultiSelectComboBox,
} from "@/components/ui/multi-select-combobox";
import MetaCard from "@/components/MetaCard";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

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

interface GalleryResponse {
  success: boolean;
  locations: Location[];
  total: number;
  countries: string[];
  continents: string[];
  states: string[];
  stats: {
    total_locations: number;
    total_countries: number;
  };
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
    page: number;
    totalPages: number;
  };
  filters: {
    country: string[] | null;
    continent: string[] | null;
    state: string[] | null;
    search: string | null;
  };
}

function HomeContent() {
  // State management
  const [locations, setLocations] = useState<Location[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [continents, setContinents] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [stats, setStats] = useState({
    total_locations: 0,
    total_countries: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedContinents, setSelectedContinents] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    limit: 72,
    offset: 0,
    hasMore: false,
    page: 1,
    totalPages: 1,
  });
  const [refreshInterval, setRefreshInterval] = useState(3000);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Ref for infinite scroll sentinel
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Load and persist auto-refresh settings
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedInterval = localStorage.getItem("refreshInterval");
    const storedEnabled = localStorage.getItem("autoRefreshEnabled");
    if (storedInterval) setRefreshInterval(parseInt(storedInterval, 10));
    if (storedEnabled) setAutoRefreshEnabled(storedEnabled === "true");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("refreshInterval", refreshInterval.toString());
    localStorage.setItem("autoRefreshEnabled", autoRefreshEnabled.toString());
  }, [refreshInterval, autoRefreshEnabled]);

  // Sync state with URL query parameters
  useEffect(() => {
    const q = searchParams.get("q") || "";
    const countryParam = searchParams.get("country");
    const continentParam = searchParams.get("continent");
    const stateParam = searchParams.get("state");
    const limitParam = parseInt(searchParams.get("limit") || "72", 10);
    const offsetParam = parseInt(searchParams.get("offset") || "0", 10);

    setSearchTerm(q);
    setSelectedCountries(countryParam ? countryParam.split(",") : []);
    setSelectedContinents(continentParam ? continentParam.split(",") : []);
    setSelectedStates(stateParam ? stateParam.split(",") : []);
    setPagination((prev) => ({
      ...prev,
      limit: limitParam,
      offset: offsetParam,
      page: Math.floor(offsetParam / limitParam) + 1,
    }));
  }, [searchParams]);

  // Fetch locations from API
  const fetchLocations = useCallback(
    async (reset = false) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams(searchParams.toString());
        const limit = parseInt(
          params.get("limit") || pagination.limit.toString(),
          10,
        );
        const offset = reset
          ? parseInt(params.get("offset") || "0", 10)
          : pagination.offset;
        params.set("limit", limit.toString());
        params.set("offset", offset.toString());

        const response = await fetch(`/api/gallery?${params}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch locations: ${response.status}`);
        }

        const data: GalleryResponse = await response.json();

        if (!data.success) {
          throw new Error("API returned an error");
        }

        setLocations((prev) =>
          reset ? data.locations : [...prev, ...data.locations],
        );
        setCountries(data.countries);
        setContinents(data.continents);
        setStates(data.states);
        setStats(data.stats);
        setPagination({
          ...data.pagination,
          offset: data.pagination.offset + data.pagination.limit,
        });
      } catch (error) {
        console.error("Failed to fetch locations:", error);
        setError(
          error instanceof Error ? error.message : "An unknown error occurred",
        );
      } finally {
        setLoading(false);
      }
    },
    [searchParams, pagination.limit, pagination.offset],
  );

  // Keep the latest fetchLocations in a ref so effects can use a stable function
  const fetchRef = useRef(fetchLocations);
  useEffect(() => {
    fetchRef.current = fetchLocations;
  }, [fetchLocations]);

  // Initial fetch & refetch when filters change
  useEffect(() => {
    fetchRef.current(true);
    // We intentionally omit pagination.offset from deps to avoid infinite loop
  }, [searchParams]);

  // Auto-refresh when the tab becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchRef.current(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Auto-refresh at configured interval
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => {
      fetchRef.current(true);
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, autoRefreshEnabled]);

  // Infinite scroll observer to automatically fetch more locations
  // Reuse the existing fetchRef so the observer callback is always fresh
  const loadingRef = useRef(loading);
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !pagination.hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          fetchRef.current(false);
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [pagination.hasMore]);

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  };

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    scrollToTop();
    setPagination((prev) => ({ ...prev, offset: 0, page: 1 }));
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm.trim()) {
      params.set("q", searchTerm.trim());
    } else {
      params.delete("q");
    }
    if (selectedCountries.length > 0) {
      params.set("country", selectedCountries.join(","));
    } else {
      params.delete("country");
    }
    if (selectedContinents.length > 0) {
      params.set("continent", selectedContinents.join(","));
    } else {
      params.delete("continent");
    }
    if (selectedStates.length > 0) {
      params.set("state", selectedStates.join(","));
    } else {
      params.delete("state");
    }
    params.delete("offset");
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Handle country filter change
  const handleCountryChange = (values: string[]) => {
    scrollToTop();
    setSelectedCountries(values);
    setPagination((prev) => ({ ...prev, offset: 0, page: 1 }));
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm.trim()) {
      params.set("q", searchTerm.trim());
    } else {
      params.delete("q");
    }
    if (values.length > 0) {
      params.set("country", values.join(","));
    } else {
      params.delete("country");
    }
    if (selectedContinents.length > 0) {
      params.set("continent", selectedContinents.join(","));
    } else {
      params.delete("continent");
    }
    if (selectedStates.length > 0) {
      params.set("state", selectedStates.join(","));
    } else {
      params.delete("state");
    }
    params.delete("offset");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleContinentChange = (values: string[]) => {
    scrollToTop();
    setSelectedContinents(values);
    setPagination((prev) => ({ ...prev, offset: 0, page: 1 }));
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm.trim()) {
      params.set("q", searchTerm.trim());
    } else {
      params.delete("q");
    }
    if (selectedCountries.length > 0) {
      params.set("country", selectedCountries.join(","));
    } else {
      params.delete("country");
    }
    if (values.length > 0) {
      params.set("continent", values.join(","));
    } else {
      params.delete("continent");
    }
    if (selectedStates.length > 0) {
      params.set("state", selectedStates.join(","));
    } else {
      params.delete("state");
    }
    params.delete("offset");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleStateChange = (values: string[]) => {
    scrollToTop();
    setSelectedStates(values);
    setPagination((prev) => ({ ...prev, offset: 0, page: 1 }));
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm.trim()) {
      params.set("q", searchTerm.trim());
    } else {
      params.delete("q");
    }
    if (selectedCountries.length > 0) {
      params.set("country", selectedCountries.join(","));
    } else {
      params.delete("country");
    }
    if (selectedContinents.length > 0) {
      params.set("continent", selectedContinents.join(","));
    } else {
      params.delete("continent");
    }
    if (values.length > 0) {
      params.set("state", values.join(","));
    } else {
      params.delete("state");
    }
    params.delete("offset");
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Handle location deletion
  const handleDeleteLocation = (locationId: number) => {
    setLocations((prev) => prev.filter((loc) => loc.id !== locationId));
    setStats((prev) => ({
      ...prev,
      total_locations: prev.total_locations - 1,
    }));
  };

  // Refresh all data
  const handleRefresh = () => {
    scrollToTop();
    setSearchTerm("");
    setSelectedCountries([]);
    setSelectedContinents([]);
    setSelectedStates([]);
    setPagination((prev) => ({ ...prev, offset: 0, page: 1 }));
    router.replace(pathname);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-2 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2 text-white">
                GeoMeta <span className="text-blue-400">Gallery</span>
              </h1>
              <p className="text-slate-300">
                Your personal collection of GeoGuessr meta clues and learning
                materials
              </p>
            </div>
            <Link href="/memorizer" className="mt-4 sm:mt-0">
                <Button variant="outline" className="w-full sm:w-auto bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                    <BrainCircuit className="mr-2 h-4 w-4" />
                    Memorizer
                </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              <span>{stats.total_locations} locations</span>
            </div>
            <div className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              <span>{stats.total_countries} countries</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{locations.length} loaded</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search countries, meta names, notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
                <Button
                  type="submit"
                  variant="outline"
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  Search
                </Button>
              </form>

              <MultiSelectComboBox
                options={continents.map((c) => ({ value: c, label: c }))}
                selected={selectedContinents}
                onChange={handleContinentChange}
                placeholder="Filter by continent..."
                className="w-full md:w-[220px]"
              />

              <MultiSelectComboBox
                options={countries.map((c) => ({ value: c, label: c }))}
                selected={selectedCountries}
                onChange={handleCountryChange}
                placeholder="Filter by country..."
                className="w-full md:w-[280px]"
              />

              <MultiSelectComboBox
                options={states.map((s) => ({ value: s, label: s }))}
                selected={selectedStates}
                onChange={handleStateChange}
                placeholder="Filter by state..."
                className="w-full md:w-[220px]"
              />

              <Button
                onClick={handleRefresh}
                variant="outline"
                className="sm:w-auto bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={() => setAutoRefreshEnabled((prev) => !prev)}
                variant="outline"
                className="sm:w-auto bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                {autoRefreshEnabled ? "Auto On" : "Auto Off"}
              </Button>
              <Select
                value={refreshInterval.toString()}
                onValueChange={(value) => setRefreshInterval(parseInt(value, 10))}
                disabled={!autoRefreshEnabled}
              >
                <SelectTrigger className="w-[100px] bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Interval" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 text-white border-slate-600">
                  <SelectItem value="3000">3s</SelectItem>
                  <SelectItem value="5000">5s</SelectItem>
                  <SelectItem value="10000">10s</SelectItem>
                  <SelectItem value="30000">30s</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="mb-6 border-red-500 bg-slate-800">
            <CardContent className="pt-6">
              <div className="text-red-400">
                <h3 className="font-semibold mb-2 text-white">
                  Error Loading Gallery
                </h3>
                <p className="text-sm">{error}</p>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  className="mt-3 bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && locations.length === 0 && (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-slate-400" />
              <p className="text-slate-300">Loading your collection...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && locations.length === 0 && !error && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-12 pb-12 text-center">
              <div className="max-w-md mx-auto">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-semibold mb-2 text-white">
                  No Locations Found
                </h3>
                {searchTerm || selectedCountries.length > 0 || selectedContinents.length > 0 ? (
                  <div>
                    <p className="text-slate-300 mb-4">
                      No locations match your current filters.
                    </p>
                    <Button
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedCountries([]);
                        setSelectedContinents([]);
                        setSelectedStates([]);
                      }}
                      variant="outline"
                      className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                    >
                      Clear Filters
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-slate-300 mb-4">
                      You haven&apos;t collected any locations yet. Install the
                      userscript and play some GeoGuessr to start building your
                      collection!
                    </p>
                    <div className="space-y-2 text-sm text-slate-400">
                      <p>📥 Install the GeoMeta Collector userscript</p>
                      <p>🎮 Play GeoGuessr games</p>
                      <p>✨ Watch your collection grow automatically</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Grid */}
        {locations.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 mb-6 auto-rows-fr">
              {locations.map((location) => (
                <div key={location.id} className="flex">
                  <MetaCard
                    location={location}
                    onDelete={handleDeleteLocation}
                  />
                </div>
              ))}
            </div>

            {/* Infinite Scroll Sentinel */}
            {pagination.hasMore && (
              <div ref={loadMoreRef} className="h-px"></div>
            )}

            {/* Pagination Info */}
            <div className="text-center mt-4 text-sm text-slate-400">
              Showing {locations.length} of {stats.total_locations} locations
            </div>
          </>
        )}
      </div>
    </div>
    );
  }

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
