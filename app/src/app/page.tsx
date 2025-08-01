"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, RefreshCw, MapPin, Database, Globe } from "lucide-react";
import { MultiSelectComboBox, Option } from "@/components/ui/multi-select-combobox";
import MetaCard from "@/components/MetaCard";

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
    search: string | null;
  };
}

export default function Home() {
  // State management
  const [locations, setLocations] = useState<Location[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [stats, setStats] = useState({
    total_locations: 0,
    total_countries: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    limit: 24,
    offset: 0,
    hasMore: false,
    page: 1,
    totalPages: 1,
  });

  // Fetch locations from API
  const fetchLocations = useCallback(
    async (reset = false) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (searchTerm.trim()) params.append("q", searchTerm.trim());
        if (selectedCountries.length > 0) {
          params.set("country", selectedCountries.join(","));
        }
        params.append("limit", pagination.limit.toString());
        params.append("offset", reset ? "0" : pagination.offset.toString());

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
        setStats(data.stats);
        setPagination({
          ...data.pagination,
          offset: reset
            ? data.pagination.limit
            : pagination.offset + data.pagination.limit,
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
    [searchTerm, selectedCountries, pagination.limit, pagination.offset],
  );

  // Fetch whenever filters (search/countries) or page size change
  useEffect(() => {
    fetchLocations(true);
    // We intentionally omit pagination.offset to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedCountries, pagination.limit]);

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, offset: 0 }));
    fetchLocations(true);
  };

  // Handle country filter change
  const handleCountryChange = (values: string[]) => {
    setSelectedCountries(values);
    setPagination((prev) => ({ ...prev, offset: 0 }));
  };

  // Handle location deletion
  const handleDeleteLocation = (locationId: number) => {
    setLocations((prev) => prev.filter((loc) => loc.id !== locationId));
    setStats((prev) => ({
      ...prev,
      total_locations: prev.total_locations - 1,
    }));
  };

  // Load more locations
  const handleLoadMore = () => {
    fetchLocations(false);
  };

  // Refresh all data
    const handleRefresh = () => {
    setSearchTerm("");
    setSelectedCountries([]);
    setPagination((prev) => ({ ...prev, offset: 0, page: 1 }));
    fetchLocations(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-2 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-white">
            GeoMeta <span className="text-blue-400">Gallery</span>
          </h1>
          <p className="text-slate-300 mb-4">
            Your personal collection of GeoGuessr meta clues and learning
            materials
          </p>

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
                options={countries.map((c) => ({ value: c, label: c }))}
                selected={selectedCountries}
                onChange={handleCountryChange}
                placeholder="Filter by country..."
                className="w-full md:w-[280px]"
              />

              <Button
                onClick={handleRefresh}
                variant="outline"
                className="sm:w-auto bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
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
                {searchTerm || selectedCountries.length > 0 ? (
                  <div>
                    <p className="text-slate-300 mb-4">
                      No locations match your current filters.
                    </p>
                    <Button
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedCountries([]);
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
                      You haven't collected any locations yet. Install the
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

            {/* Load More */}
            {pagination.hasMore && locations.length > 0 && (
              <div className="text-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={loading}
                  variant="outline"
                  size="lg"
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    `Load More (${stats.total_locations - locations.length} remaining)`
                  )}
                </Button>
              </div>
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
