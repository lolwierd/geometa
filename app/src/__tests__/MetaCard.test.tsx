import { render, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MetaCard from "@/components/MetaCard";

describe("MetaCard", () => {
  it("sanitizes location.note to prevent XSS", async () => {
    const malicious =
      '<img src=x onerror="window.__xss=true"><script>window.__xss2=true</script><p>Safe</p>';
    const location = {
      id: 1,
      country: "Testland",
      country_code: null,
      meta_name: null,
      note: malicious,
      footer: null,
      images: [],
      pano_id: "",
      map_id: "",
      created_at: "2020-01-01T00:00:00Z",
      updated_at: "2020-01-01T00:00:00Z",
    };

    const { container } = render(
      <MetaCard location={location} onDelete={() => {}} />,
    );

    fireEvent.click(container.firstChild as HTMLElement);

    await waitFor(() => {
      return document.querySelector(".prose div");
    });

    const noteHtml = document.querySelector(".prose div")!.innerHTML;

    expect(noteHtml).not.toContain("onerror");
    expect(noteHtml).not.toContain("<script");
  });
});
