"use client";

import { useState, useRef, useEffect, type MouseEvent } from "react";
import Image from "next/image";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  MapPin,
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

interface MemorizerCardProps {
  location: Location;
}

// This is a dedicated version of MetaCard for the memorizer page.
// It's not a modal, but a large, standalone card.
export default function MemorizerCard({ location }: MemorizerCardProps) {
  // --- STATE MANAGEMENT ---
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});
  const [showTechDetails, setShowTechDetails] = useState(false);
  const techDetailsRef = useRef<HTMLDivElement | null>(null);

  // --- HANDLER FUNCTIONS ---
  const handleImageError = (imageUrl: string) => {
    setImageError((prev) => ({ ...prev, [imageUrl]: true }));
  };

  const nextImage = (e: MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const previousImage = (e: MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // --- HELPER FUNCTIONS ---
  const images = Array.isArray(location.images)
    ? location.images.filter((img) => img && !imageError[img])
    : [];

  const proxyUrl = (u: string) => (u ? `/api/img?u=${encodeURIComponent(u)}` : "");

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
    <div className="w-full max-w-3xl mx-auto bg-slate-800 border border-slate-700 rounded-lg overflow-hidden flex flex-col">
      {/* --- HEADER --- */}
      <div className="flex-shrink-0 p-4 bg-slate-900/50">
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-4 text-white flex-1">
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
                        src={proxyUrl(`https://flagcdn.com/64x48/${location.country_code.toLowerCase()}.png`)}
                        width={32}
                        height={24}
                        alt={`${location.country} flag`}
                        className="rounded-sm border-slate-600 hover:border-blue-400 transition-colors"
                        unoptimized
                        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                      />
                    </a>
                  ) : (
                    <Image
                      src={proxyUrl(`https://flagcdn.com/64x48/${location.country_code.toLowerCase()}.png`)}
                      width={32}
                      height={24}
                      alt={`${location.country} flag`}
                      className="rounded-sm border-slate-600 flex-shrink-0"
                      unoptimized
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
          </div>
        </div>
      </div>

      {/* --- CONTENT --- */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 [scrollbar-gutter:stable]">
        {location.note && (
          <div className="prose prose-invert prose-slate max-w-none text-base">
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
                unoptimized
                onError={() => handleImageError(images[currentImageIndex])}
              />

              {images.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={previousImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/70 border-slate-600 text-white hover:bg-black/90 h-9 w-9 sm:h-8 sm:w-8"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/70 border-slate-600 text-white hover:bg-black/90 h-9 w-9 sm:h-8 sm:w-8"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex justify-center gap-2 pt-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(index);
                    }}
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

      {/* --- FOOTER --- */}
      <div className="flex-shrink-0 text-center border-t border-slate-700">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowTechDetails(!showTechDetails)}
          className="h-8 w-full text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-none"
          title={showTechDetails ? "Hide details" : "Show details"}
        >
          <ChevronUp
            className={`h-5 w-5 transition-transform duration-200 ${!showTechDetails && "rotate-180"
              }`}
          />
        </Button>
      </div>
    </div>
  );
}
