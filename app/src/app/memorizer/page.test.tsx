import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import MemorizerPage from "./page";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={typeof href === "string" ? href : ""}>{children}</a>,
}));

describe("MemorizerPage update errors", () => {
  it("shows an error message and does not fetch next card when update fails", async () => {
    const location = {
      id: 1,
      pano_id: "p1",
      map_id: "m1",
      country: "USA",
      country_code: "US",
      meta_name: null,
      note: null,
      footer: null,
      images: [],
      raw_data: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const successResponse = {
      success: true,
      location,
      stats: {
        new: 0,
        review: 0,
        lapsed: 0,
        newTotal: 0,
        reviewTotal: 0,
        lapsedTotal: 0,
      },
      countries: [],
      continents: [],
    };

    const errorResponse = { success: false, message: "Update failed" };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(successResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(errorResponse), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      );

    (global as any).fetch = fetchMock;

    render(<MemorizerPage />);

    await waitFor(() => expect(screen.getByText("Good")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Good"));

    await waitFor(() =>
      expect(screen.getByText("Update failed")).toBeInTheDocument()
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("MemorizerPage keyboard shortcuts", () => {
  it("updates progress when shortcut keys are pressed", async () => {
    const location = {
      id: 1,
      pano_id: "p1",
      map_id: "m1",
      country: "USA",
      country_code: "US",
      meta_name: null,
      note: null,
      footer: null,
      images: [],
      raw_data: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const successResponse = {
      success: true,
      location,
      stats: {
        new: 0,
        review: 0,
        lapsed: 0,
        newTotal: 0,
        reviewTotal: 0,
        lapsedTotal: 0,
      },
      countries: [],
      continents: [],
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(successResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValue(
        new Response(JSON.stringify(successResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    (global as any).fetch = fetchMock;

    render(<MemorizerPage />);

    await waitFor(() => expect(screen.getByText("Good")).toBeInTheDocument());

    fireEvent.keyDown(window, { key: "1" });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    const postCall = fetchMock.mock.calls[1];
    expect(postCall[1]?.body).toContain('"quality":0');
  });
});
