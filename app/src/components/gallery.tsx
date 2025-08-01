"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Filter,
  Trash2,
  Eye,
  Calendar,
  MapPin,
  Download,
  AlertTriangle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import Image from "next/image";

interface Screenshot {
  id: number;
  image_path: string;
  metadata: any;
  country: string;
  created_at: string;
}

export default function Gallery() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [filteredScreenshots, setFilteredScreenshots] = useState<Screenshot[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [country, setCountry] = useState("");
  const [countries, setCountries] = useState<string[]>([]);

  // Modal states
  const [selectedScreenshot, setSelectedScreenshot] =
    useState<Screenshot | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [quizMode, setQuizMode] = useState(false);

  // Delete modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [screenshotToDelete, setScreenshotToDelete] =
    useState<Screenshot | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all screenshots
  const fetchScreenshots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/gallery");
      if (!response.ok) {
        throw new Error("Failed to fetch screenshots");
      }
      const data = await response.json();
      setScreenshots(data);

      // Extract unique countries
      const uniqueCountries = Array.from(
        new Set<string>(data.map((ss: Screenshot) => ss.country)),
      ).sort();
      setCountries(uniqueCountries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter screenshots based on search and country
  useEffect(() => {
    let filtered = screenshots;

    if (country) {
      filtered = filtered.filter((ss) => ss.country === country);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ss) =>
          ss.country.toLowerCase().includes(query) ||
          JSON.stringify(ss.metadata).toLowerCase().includes(query),
      );
    }

    setFilteredScreenshots(filtered);
  }, [screenshots, searchQuery, country]);

  useEffect(() => {
    fetchScreenshots();
  }, [fetchScreenshots]);

  const handleScreenshotClick = (screenshot: Screenshot) => {
    setSelectedScreenshot(screenshot);
    setModalOpen(true);
    setQuizMode(false);
  };

  const handleDeleteClick = (screenshot: Screenshot, e: React.MouseEvent) => {
    e.stopPropagation();
    setScreenshotToDelete(screenshot);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!screenshotToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/delete?id=${screenshotToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete screenshot");
      }

      // Remove from local state
      setScreenshots((prev) =>
        prev.filter((ss) => ss.id !== screenshotToDelete.id),
      );
      setDeleteModalOpen(false);
      setScreenshotToDelete(null);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete screenshot. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = (screenshot: Screenshot) => {
    const link = document.createElement("a");
    link.href = screenshot.image_path;
    link.download = `${screenshot.country}-${new Date(screenshot.created_at).toISOString().split("T")[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
        />
        <span className="ml-3 text-muted-foreground">
          Loading your meta collection...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-destructive">
        <AlertTriangle className="mr-2" />
        <span>Error: {error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meta Gallery</h1>
          <p className="text-muted-foreground mt-1">
            {filteredScreenshots.length} screenshot
            {filteredScreenshots.length !== 1 ? "s" : ""}
            {filteredScreenshots.length !== screenshots.length &&
              ` of ${screenshots.length} total`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search countries, notes, or any meta clues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full pl-10 pr-8 py-2 border border-input bg-background rounded-md focus:ring-2 focus:ring-ring focus:border-ring transition-colors appearance-none"
          >
            <option value="">All Countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Gallery Grid */}
      {filteredScreenshots.length === 0 ? (
        <div className="text-center py-16">
          <Eye className="mx-auto mb-4 text-muted-foreground h-12 w-12" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No screenshots found
          </h3>
          <p className="text-muted-foreground">
            {searchQuery || country
              ? "Try adjusting your filters"
              : "Start playing GeoGuessr to capture some meta!"}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
          {filteredScreenshots.map((screenshot) => (
            <Card
              key={screenshot.id}
              className="relative group cursor-pointer overflow-hidden"
              onClick={() => handleScreenshotClick(screenshot)}
            >
              <CardContent className="p-0">
                <Image
                  src={screenshot.image_path}
                  alt={screenshot.country}
                  width={512}
                  height={512}
                  className="aspect-square object-cover w-full h-auto"
                />
              </CardContent>

              <CardFooter className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-1 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs truncate pr-1">
                  {screenshot.country}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-white hover:bg-white/10"
                  onClick={(e) => handleDeleteClick(screenshot, e)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Screenshot Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          {selectedScreenshot && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {selectedScreenshot.country}
                </DialogTitle>
              </DialogHeader>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(selectedScreenshot.created_at)}</span>
              </div>

              <div className="flex gap-2 mb-4">
                <Button
                  variant={quizMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuizMode(!quizMode)}
                >
                  {quizMode ? "Show Meta" : "Quiz Mode"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(selectedScreenshot)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <div className="relative bg-gray-100 rounded overflow-hidden">
                    <Image
                      src={selectedScreenshot.image_path}
                      alt={selectedScreenshot.country}
                      width={800}
                      height={800}
                      className="w-full h-auto max-h-[400px] object-contain"
                    />
                    {quizMode && (
                      <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                        <div className="text-center text-white">
                          <Eye className="mx-auto mb-4 h-8 w-8" />
                          <h3 className="text-lg font-bold mb-2">Quiz Mode</h3>
                          <p className="mb-4">Try to identify the country!</p>
                          <Button onClick={() => setQuizMode(false)}>
                            Show Answer
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {!quizMode && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Meta Information</h3>

                    {selectedScreenshot.metadata.note && (
                      <div>
                        <h4 className="font-medium text-sm mb-1">
                          Description
                        </h4>
                        <p className="text-sm bg-gray-50 p-3 rounded">
                          {selectedScreenshot.metadata.note}
                        </p>
                      </div>
                    )}

                    {selectedScreenshot.metadata.footer && (
                      <div>
                        <h4 className="font-medium text-sm mb-1">Source</h4>
                        <div
                          className="text-sm bg-gray-50 p-3 rounded"
                          dangerouslySetInnerHTML={{
                            __html: selectedScreenshot.metadata.footer,
                          }}
                        />
                      </div>
                    )}

                    {selectedScreenshot.metadata.images &&
                      selectedScreenshot.metadata.images.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">
                            Additional Images (
                            {selectedScreenshot.metadata.images.length})
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {selectedScreenshot.metadata.images
                              .slice(0, 4)
                              .map((imgUrl: string, index: number) => (
                                <Image
                                  key={index}
                                  src={imgUrl}
                                  alt={`Meta ${index + 1}`}
                                  width={64}
                                  height={64}
                                  className="w-full h-16 object-cover rounded"
                                />
                              ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Screenshot</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this screenshot from{" "}
            <strong>{screenshotToDelete?.country}</strong>? This cannot be
            undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
