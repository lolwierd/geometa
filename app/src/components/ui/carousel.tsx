"use client";

import React, { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CarouselProps {
  images: string[];
  className?: string;
  showZoom?: boolean;
  showIndicators?: boolean;
  showControls?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export function Carousel({
  images,
  className,
  showZoom = true,
  showIndicators = true,
  showControls = true,
  autoPlay = false,
  autoPlayInterval = 3000,
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [lensPosition, setLensPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const lensSize = 150;
  const scale = 2;

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  }, [images.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !showZoom) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setLensPosition({ x, y });
  }, [showZoom]);

  const handleMouseEnter = useCallback(() => {
    if (showZoom) setIsZoomed(true);
  }, [showZoom]);

  const handleMouseLeave = useCallback(() => {
    if (showZoom) setIsZoomed(false);
  }, [showZoom]);

  // Auto-play functionality
  React.useEffect(() => {
    if (!autoPlay || images.length <= 1) return;

    const interval = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, goToNext, images.length]);

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        goToPrevious();
      } else if (event.key === 'ArrowRight') {
        goToNext();
      } else if (event.key >= '1' && event.key <= '9') {
        const index = parseInt(event.key) - 1;
        if (index < images.length) {
          goToSlide(index);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext, goToSlide, images.length]);

  if (!images || images.length === 0) {
    return (
      <div className={cn("flex items-center justify-center bg-muted rounded-lg h-64", className)}>
        <p className="text-muted-foreground">No images to display</p>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-background", className)}>
      {/* Main Image Container */}
      <div
        ref={containerRef}
        className="relative w-full h-full flex justify-center items-center cursor-zoom-in group"
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Image
          ref={imageRef}
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1} of ${images.length}`}
          width={800}
          height={600}
          className="max-w-full h-auto object-contain transition-transform duration-200"
          priority={currentIndex === 0}
        />

        {/* Zoom Lens */}
        {isZoomed && showZoom && imageRef.current && (
          <div
            className="absolute pointer-events-none border-2 border-gray-400 rounded-full shadow-lg"
            style={{
              top: lensPosition.y - lensSize / 2,
              left: lensPosition.x - lensSize / 2,
              width: lensSize,
              height: lensSize,
              backgroundImage: `url(${images[currentIndex]})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: `${imageRef.current.width * scale}px ${imageRef.current.height * scale}px`,
              backgroundPosition: `${-(lensPosition.x * scale - lensSize / 2)}px ${-(lensPosition.y * scale - lensSize / 2)}px`,
            }}
          />
        )}

        {/* Navigation Controls */}
        {showControls && images.length > 1 && (
          <>
            {/* Previous Button */}
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:opacity-100"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Next Button */}
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:opacity-100"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Indicators */}
      {showIndicators && images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-200",
                index === currentIndex
                  ? "bg-white shadow-lg"
                  : "bg-white/60 hover:bg-white/80"
              )}
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
    </div>
  );
}

// Utility component for creating image galleries
export function ImageGallery({
  images,
  className,
  itemClassName,
  ...carouselProps
}: CarouselProps & {
  itemClassName?: string;
}) {
  if (!images || images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className={cn("relative", className)}>
        <Image
          src={images[0]}
          alt="Gallery image"
          width={800}
          height={600}
          className={cn("w-full h-auto object-contain rounded-lg", itemClassName)}
        />
      </div>
    );
  }

  return (
    <Carousel
      images={images}
      className={className}
      {...carouselProps}
    />
  );
}

export default Carousel;
