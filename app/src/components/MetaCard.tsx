"use client";

import { useState, useRef, useEffect, type MouseEvent } from "react";
import Image from "next/image";
import DOMPurify from "dompurify";
import { API_BASE_URL } from "@/lib/config";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  MapPin,
  X,
} from "lucide-react";

export interface Location {
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

interface MetaCardProps {
  location: Location;
  onDelete: (id: number) => void;
}

export default function MetaCard({ location, onDelete }: MetaCardProps) {
  // --- STATE MANAGEMENT ---
  const [showModal, setShowModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});
  const [showTechDetails, setShowTechDetails] = useState(false);
  const techDetailsRef = useRef<HTMLDivElement | null>(null);

  // --- HANDLER FUNCTIONS ---
  const handleDelete = async (e: MouseEvent) => {
    e.stopPropagation(); // Prevent modal from opening
    if (
      confirm(
        `Are you sure you want to delete the location "${location.country}"?`,
      )
    ) {
      try {
        const response = await fetch(`${API_BASE_URL}/gallery?id=${location.id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to delete");
        }
        onDelete(location.id);
      } catch (error) {
        console.error("Failed to delete location:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        alert(`Failed to delete location: ${message}`);
      }
    }
  };

  const handleModalOpenChange = (open: boolean) => {
    setShowModal(open);
    // Reset state when modal is closed to ensure it's always hidden on next open
    if (!open) {
      setShowTechDetails(false);
      setCurrentImageIndex(0);
    }
  };

  const handleImageError = (imageUrl: string) => {
    setImageError((prev) => ({ ...prev, [imageUrl]: true }));
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // --- HELPER FUNCTIONS ---
  const images = Array.isArray(location.images)
    ? location.images.filter((img) => img && !imageError[img])
    : [];

  // Generate proxied URL that goes through our cache route for caching
  const proxyUrl = (u: string) => (u ? `${API_BASE_URL}/img?u=${encodeURIComponent(u)}` : "");

  const stripHtml = (html: string | null) => {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  };

  const truncateText = (text: string | null, maxLength = 150) => {
    if (!text) return "";
    const stripped = stripHtml(text);
    return stripped.length > maxLength
      ? stripped.substring(0, maxLength) + "..."
      : stripped;
  };

  const extractLink = (html: string | null) => {
    if (!html) return null;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const link = doc.querySelector("a");
    return link ? link.href : null;
  };

  const footerLink = extractLink(location.footer);
  // Sanitize user-provided HTML to avoid XSS issues
  const sanitizedNote = location.note
    ? DOMPurify.sanitize(location.note)
    : "";

  // --- EFFECT FOR AUTO-SCROLL ---
  useEffect(() => {
    if (showTechDetails && techDetailsRef.current) {
      techDetailsRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [showTechDetails]);

  return (
    <>
      {/* --- GALLERY CARD --- */}
      <div
        className="bg-slate-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group h-full flex flex-col"
        onClick={() => handleModalOpenChange(true)}
      >
        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleModalOpenChange(true);
            }}
            className="h-7 w-7 p-0 text-white/80 bg-black/50 hover:bg-black/70 hover:text-white backdrop-blur-sm"
            title="View details"
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-7 w-7 p-0 text-white/80 bg-black/50 hover:bg-red-600 hover:text-white backdrop-blur-sm"
            title="Delete location"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        <div className="p-4 text-white flex-1 flex flex-col">
          <div className="flex-grow">
            <div className="flex items-center gap-2 mb-3">
              {location.country_code && (
                <Image
                  src={proxyUrl(`https://flagcdn.com/40x30/${location.country_code.toLowerCase()}.png`)} width={20} height={15}
                  alt={`${location.country} flag`}
                  className="rounded-sm"
                  unoptimized={true}
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-white truncate">
                  {location.country}
                  {location.meta_name && (
                    <span className="text-xs font-normal text-slate-300 ml-1">
                      - {location.meta_name}
                    </span>
                  )}
                </h2>
              </div>
            </div>
            {location.note && (
              <div className="mb-3 text-slate-300 leading-relaxed">
                <p className="text-xs">{truncateText(location.note, 150)}</p>
              </div>
            )}
          </div>
          <div className="mt-auto">
            {images.length > 0 && (
              <div className="relative rounded-md overflow-hidden bg-slate-900 group/image">
                <div className="aspect-video">
                  <Image
                    src={proxyUrl(images[0])}
                    alt="Location meta image"
                    width={320}
                    height={180}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized={true}
                    onError={(e) => handleImageError(images[0])}
                  />
                </div>
                {images.length > 1 && (
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded backdrop-blur-sm">
                    +{images.length - 1}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="w-12 h-12 border-2 border-white/50 rounded-full flex items-center justify-center backdrop-blur-sm bg-black/20">
                      <Eye className="h-5 w-5 text-white/70" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {images.length === 0 && (
              <div className="aspect-video bg-slate-700 rounded-md flex items-center justify-center">
                <div
                  className="text-center text-slate-
400"
                >
                  <Eye className="h-8 w-8 mx-auto mb-1 opacity-50" />
                  <p className="text-xs">No image</p>
                </div>
              </div>
            )}
            <div className="flex justify-between items-center text-xs text-slate-500 mt-2 pt-2 border-t border-slate-700">
              <span>{new Date(location.created_at).toLocaleDateString()}</span>
              {images.length > 0 && (
                <span>
                  {images.length} img{images.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- DETAILED MODAL --- */}
      <Dialog open={showModal} onOpenChange={handleModalOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-slate-800 border-slate-600 text-white p-0 break-words">
          <DialogHeader className="flex-shrink-0 p-4 bg-slate-900/50">
            <div className="flex items-center justify-between gap-4 w-full">
            <DialogTitle className="flex justify-between items-center gap-4 text-white flex-1">
              <div className="flex items-center gap-3">
                {location.country_code && (
                  <>
                    {footerLink ? (
                      <a
                        href={footerLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Open source link"
                        className="flex-shrink-0"
                      >
                        <Image
                          src={proxyUrl(`https://flagcdn.com/64x48/${location.country_code.toLowerCase()}.png`)} width={32} height={24}
                          alt={`${location.country} flag`}
                          className="rounded-sm border-slate-600 hover:border-blue-400 transition-colors"
                          unoptimized={true}
                          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                        />
                      </a>
                    ) : (
                      <Image
                        src={proxyUrl(`https://flagcdn.com/64x48/${location.country_code.toLowerCase()}.png`)} width={32} height={24}
                        alt={`${location.country} flag`}
                        className="rounded-sm border-slate-600 flex-shrink-0"
                        unoptimized={true}
                        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                      />
                    )}
                  </>
                )}
                <span className="text-2xl font-bold">{location.country}</span>
              </div>
              {location.meta_name && (
                <span className="text-lg text-slate-300 font-normal text-right">
                  {location.meta_name}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Detailed view of location meta information including images and technical details
            </DialogDescription>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-slate-700/50 flex-shrink-0"
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-scroll p-6 space-y-6 [scrollbar-gutter:stable]">
            {location.note && (
              <div className="prose prose-invert prose-slate max-w-none text-slate-200">
                <div dangerouslySetInnerHTML={{ __html: sanitizedNote }} />
              </div>
            )}

            {images.length > 0 && (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden bg-slate-900/50 border border-slate-700">
                  <Image
                    src={proxyUrl(images[currentImageIndex])}
                    alt={`Meta image ${currentImageIndex + 1}`}
                    width={1920}
                    height={1080}
                    className="w-full max-h-[60vh] object-contain rounded-md"
                    unoptimized={true}
                    onError={(e) => handleImageError(images[currentImageIndex])}
                  />

                  {images.length > 1 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={previousImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/70 border-slate-600 text-white hover:bg-black/90"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/70 border-slate-600 text-white hover:bg-black/90"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="flex justify-center gap-2 pt-2">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${index === currentImageIndex
                          ? "bg-blue-500"
                          : "bg-slate-600 hover:bg-slate-500"
                          }`}
                        title={`Image ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {showTechDetails && (
              <div
                ref={techDetailsRef}
                className="pt-6 border-t border-slate-700"
              >
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-lg text-slate-200">
                    Technical Details
                  </h4>
                  <a
                    href={`https://www.google.com/maps?layer=c&panoid=${location.pano_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in Google Street View"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Street View
                    </Button>
                  </a>
                </div>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div className="space-y-1">
                    <dt className="font-medium text-slate-400">Pano ID</dt>
                    <dd className="bg-slate-900 px-3 py-1.5 rounded-md text-xs font-mono border border-slate-700 text-slate-300">
                      {location.pano_id}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="font-medium text-slate-400">Map ID</dt>
                    <dd className="bg-slate-900 px-3 py-1.5 rounded-md text-xs font-mono border border-slate-700 text-slate-300">
                      {location.map_id}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="font-medium text-slate-400">Collected</dt>
                    <dd className="text-slate-300 pt-1">
                      <span className="block">
                        {new Date(location.created_at).toLocaleDateString()}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {new Date(location.created_at).toLocaleTimeString()}
                      </span>
                    </dd>
                  </div>
                  {location.updated_at !== location.created_at && (
                    <div className="space-y-1">
                      <dt className="font-medium text-slate-400">Updated</dt>
                      <dd className="text-slate-300 pt-1">
                        <span className="block">
                          {new Date(location.updated_at).toLocaleDateString()}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {new Date(location.updated_at).toLocaleTimeString()}
                        </span>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 text-center border-t border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTechDetails(!showTechDetails)}
              className="h-7 w-full text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-none"
              title={showTechDetails ? "Hide details" : "Show details"}
            >
              <ChevronUp
                className={`h-4 w-4 transition-transform duration-200 ${!showTechDetails && "rotate-180"
                  }`}
              />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
