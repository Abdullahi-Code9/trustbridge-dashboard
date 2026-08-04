import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest does not enable Testing Library's Jest-style auto-cleanup unless
// globals are on — clean up the DOM between component tests explicitly.
afterEach(() => {
  cleanup();
});
