"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Grid3X3,
  List,
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
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface Screenshot {
  id: number;
  image_path: string;
  metadata: any;
  country: string;
  created_at: string;
}

interface CarouselProps {
  images: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  showZoom?: boolean;
}

function ImageCarousel({ images, currentIndex, onIndexChange, showZoom = true }: CarouselProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [lensPosition, setLensPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const lensSize = 150;
  const scale = 2;

  const goToPrevious = useCallback(() => {
    onIndexChange((currentIndex - 1 + images.length) % images.length);
  }, [currentIndex, images.length, onIndexChange]);

  const goToNext = useCallback(() => {
    onIndexChange((currentIndex + 1) % images.length);
  }, [currentIndex, images.length, onIndexChange]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !showZoom) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setLensPosition({ x, y });
  }, [showZoom]);

  const handleMouseEnter = useCallback(() => {
    if (showZoom && images.length > 0) setIsZoomed(true);
  }, [showZoom, images.length]);

  const handleMouseLeave = useCallback(() => {
    if (showZoom) setIsZoomed(false);
  }, [showZoom]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        goToPrevious();
      } else if (event.key === 'ArrowRight') {
        goToNext();
      } else if (event.key >= '1' && event.key <= '9') {
        const index = parseInt(event.key) - 1;
        if (index < images.length) {
          onIndexChange(index);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext, onIndexChange, images.length]);

  if (!images || images.length === 0) {
    return (
      <div className="flex items-center justify-center bg-muted rounded-lg h-96">
        <p className="text-muted-foreground">No images to display</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg bg-background border">
      {/* Main Image Container */}
      <div
        ref={containerRef}
        className="relative w-full h-96 flex justify-center items-center cursor-zoom-in group bg-muted"
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative w-full h-full">
          <Image
            ref={imageRef}
            src={images[currentIndex]}
            alt={`Image ${currentIndex + 1} of ${images.length}`}
            fill
            className="object-contain transition-transform duration-200"
            priority={currentIndex === 0}
          />

          {/* Zoom Lens */}
          {isZoomed && showZoom && imageRef.current && (
            <div
              className="absolute pointer-events-none border-2 border-gray-400 rounded-full shadow-lg z-10"
              style={{
                top: lensPosition.y - lensSize / 2,
                left: lensPosition.x - lensSize / 2,
                width: lensSize,
                height: lensSize,
                backgroundImage: `url(${images[currentIndex]})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${(imageRef.current.width || 0) * scale}px ${(imageRef.current.height || 0) * scale}px`,
                backgroundPosition: `${-(lensPosition.x * scale - lensSize / 2)}px ${-(lensPosition.y * scale - lensSize / 2)}px`,
              }}
            />
          )}
        </div>

        {/* Navigation Controls */}
        {images.length > 1 && (
          <>
            {/* Previous Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            {/* Next Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>

      {/* Indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => onIndexChange(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                index === currentIndex
                  ? "bg-white shadow-lg"
                  : "bg-white/60 hover:bg-white/80"
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Image Counter */}
      {images.length > 1 && (
        <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Zoom Indicator */}
      {showZoom && (
        <div className="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
          <ZoomIn className="w-3 h-3" />
          Hover to zoom
        </div>
      )}
    </div>
  );
}

export default function EnhancedGallery() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [filteredScreenshots, setFilteredScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [country, setCountry] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal states
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [quizMode, setQuizMode] = useState(false);

  // Delete modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [screenshotToDelete, setScreenshotToDelete] = useState<Screenshot | null>(null);
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
    setModalImageIndex(0);
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

  const getModalImages = (screenshot: Screenshot) => {
    const images = [screenshot.image_path];
    if (screenshot.metadata.images && Array.isArray(screenshot.metadata.images)) {
      images.push(...screenshot.metadata.images);
    }
    return images;
  };

  const getStats = () => {
    const totalCountries = new Set(screenshots.map(s => s.country)).size;
    const totalImages = screenshots.reduce((acc, s) => {
      return acc + 1 + (s.metadata.images?.length || 0);
    }, 0);

    return {
      screenshots: screenshots.length,
      countries: totalCountries,
      images: totalImages,
      showing: filteredScreenshots.length
    };
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
          Loading your enhanced meta collection...
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

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Enhanced Meta Gallery</h1>
            <p className="text-muted-foreground mt-1">
              {stats.showing} screenshot{stats.showing !== 1 ? "s" : ""}
              {stats.showing !== stats.screenshots && ` of ${stats.screenshots} total`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4 mr-2" />
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4 mr-2" />
              List
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.screenshots}</div>
              <div className="text-sm text-muted-foreground">Screenshots</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.countries}</div>
              <div className="text-sm text-muted-foreground">Countries</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.images}</div>
              <div className="text-sm text-muted-foreground">Total Images</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.showing}</div>
              <div className="text-sm text-muted-foreground">Showing</div>
            </CardContent>
          </Card>
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

      {/* Gallery Grid/List */}
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
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]"
            >
              {filteredScreenshots.map((screenshot) => (
                <motion.div
                  key={screenshot.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className="relative group cursor-pointer overflow-hidden h-full"
                    onClick={() => handleScreenshotClick(screenshot)}
                  >
                    <CardContent className="p-0">
                      <div className="relative aspect-square">
                        <Image
                          src={screenshot.image_path}
                          alt={screenshot.country}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {/* Image count indicator */}
                        {screenshot.metadata.images && screenshot.metadata.images.length > 0 && (
                          <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                            +{screenshot.metadata.images.length}
                          </div>
                        )}
                      </div>
                    </CardContent>

                    <CardFooter className="p-4">
                      <div className="flex justify-between items-center w-full">
                        <div>
                          <h3 className="font-semibold text-lg">{screenshot.country}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(screenshot.created_at)}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDeleteClick(screenshot, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {filteredScreenshots.map((screenshot) => (
                <motion.div
                  key={screenshot.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <Card
                    className="group cursor-pointer transition-all duration-200 hover:shadow-lg"
                    onClick={() => handleScreenshotClick(screenshot)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="relative w-20 h-20 flex-shrink-0">
                          <Image
                            src={screenshot.image_path}
                            alt={screenshot.country}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">{screenshot.country}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(screenshot.created_at)}
                          </p>
                          {screenshot.metadata.note && (
                            <p className="text-sm mt-1 line-clamp-2 text-muted-foreground">
                              {screenshot.metadata.note.replace(/<[^>]*>/g, '')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {screenshot.metadata.images && screenshot.metadata.images.length > 0 && (
                            <span className="text-xs bg-muted px-2 py-1 rounded">
                              +{screenshot.metadata.images.length}
                            </span>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDeleteClick(screenshot, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Enhanced Screenshot Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] w-[95vw]">
          {selectedScreenshot && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <MapPin className="h-5 w-5" />
                  {selectedScreenshot.country}
                </DialogTitle>
              </DialogHeader>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(selectedScreenshot.created_at)}</span>
                </div>
                {selectedScreenshot.metadata.images && (
                  <span>{getModalImages(selectedScreenshot).length} images total</span>
                )}
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto">
                {/* Enhanced Carousel */}
                <div className="space-y-4">
                  <ImageCarousel
                    images={getModalImages(selectedScreenshot)}
                    currentIndex={modalImageIndex}
                    onIndexChange={setModalImageIndex}
                    showZoom={!quizMode}
                  />

                  {quizMode && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
                      <div className="text-center text-white p-8">
                        <Eye className="mx-auto mb-4 h-12 w-12" />
                        <h3 className="text-2xl font-bold mb-4">Quiz Mode</h3>
                        <p className="mb-6 text-lg">Try to identify the country!</p>
                        <Button size="lg" onClick={() => setQuizMode(false)}>
                          Show Answer
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Meta Information */}
                {!quizMode && (
                  <div className="space-y-6">
                    <h3 className="font-semibold text-lg border-b pb-2">Meta Information</h3>

                    {selectedScreenshot.metadata.note && (
                      <div>
                        <h4 className="font-medium text-base mb-2 text-primary">
                          Description
                        </h4>
                        <div
                          className="text-sm bg-muted p-4 rounded-lg leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: selectedScreenshot.metadata.note }}
                        />
                      </div>
                    )}

                    {selectedScreenshot.metadata.footer && (
                      <div>
                        <h4 className="font-medium text-base mb-2 text-primary">Source</h4>
                        <div
                          className="text-sm bg-muted p-4 rounded-lg leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: selectedScreenshot.metadata.footer,
                          }}
                        />
                      </div>
                    )}

                    {selectedScreenshot.metadata.images &&
                      selectedScreenshot.metadata.images.length > 0 && (
                        <div>
                          <h4 className="font-medium text-base mb-2 text-primary">
                            Additional Images ({selectedScreenshot.metadata.images.length})
                          </h4>
                          <div className="grid grid-cols-3 gap-2">
                            {selectedScreenshot.metadata.images
                              .slice(0, 6)
                              .map((imgUrl: string, index: number) => (
                                <div
                                  key={index}
                                  className="relative aspect-square cursor-pointer rounded overflow-hidden hover:opacity-80 transition-opacity"
                                  onClick={() => setModalImageIndex(index + 1)}
                                >
                                  <Image
                                    src={imgUrl}
                                    alt={`Meta ${index + 1}`}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
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
