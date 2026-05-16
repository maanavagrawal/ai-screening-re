import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BudgetQuestion, BUYER_BUDGET_MAX } from "@/components/intake/questions/budget-question";

describe("BudgetQuestion", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("allows high-price markets and treats the top slider value as open-ended", () => {
    vi.stubGlobal("React", React);
    const onAnswer = vi.fn();

    render(<BudgetQuestion onAnswer={onAnswer} />);

    const maxInput = screen.getByLabelText("Maximum budget") as HTMLInputElement;
    expect(maxInput.max).toBe(String(BUYER_BUDGET_MAX));

    fireEvent.change(maxInput, { target: { value: String(BUYER_BUDGET_MAX) } });

    expect(screen.getByText("$500k–$10M+")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onAnswer).toHaveBeenCalledWith({ min: 500000 });
  });
});
