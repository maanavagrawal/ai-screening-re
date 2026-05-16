import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocationQuestion } from "@/components/intake/questions/choice-questions";

function responseFor(label: string) {
  return new Response(JSON.stringify({
    suggestions: [
      {
        label,
        source: "manual",
        type: "custom"
      }
    ]
  }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

describe("LocationQuestion", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("ignores stale autocomplete responses that return out of order", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("React", React);
    const resolvers = new Map<string, (response: Response) => void>();
    vi.spyOn(globalThis, "fetch").mockImplementation(((_url, init) => {
      const body = JSON.parse(String((init as RequestInit).body)) as { query: string };
      return new Promise((resolve) => {
        resolvers.set(body.query, resolve);
      });
    }) as typeof fetch);

    render(
      <LocationQuestion
        agentSlug="elena"
        initialOptions={["East Austin"]}
        onAnswer={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText("City, neighborhood, ZIP, or school district");
    fireEvent.change(input, { target: { value: "a" } });
    await act(async () => {
      vi.advanceTimersByTime(180);
    });

    fireEvent.change(input, { target: { value: "ab" } });
    await act(async () => {
      vi.advanceTimersByTime(180);
    });

    await act(async () => {
      resolvers.get("ab")?.(responseFor("Ab Place"));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("Ab Place")).toBeTruthy();

    await act(async () => {
      resolvers.get("a")?.(responseFor("A Place"));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.queryByText("A Place")).toBeNull();
    expect(screen.getByText("Ab Place")).toBeTruthy();
  });
});
