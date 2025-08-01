import Gallery from "@/components/gallery";

export default function Home() {
  return (
        <main className="min-h-screen bg-gradient-to-b from-background via-muted/50 to-background">
      <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2">
            GeoMeta <span className="text-primary">Gallery</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            An organized collection of your GeoGuessr learnable meta screenshots.
          </p>
        </header>
        <Gallery />
      </section>
    </main>
  );
}
