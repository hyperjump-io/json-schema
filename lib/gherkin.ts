import { describe, it } from "vitest";

import type { SuiteFactory, TestFunction } from "vitest";


export const Given = (message: string, fn: SuiteFactory | undefined) => describe("Given " + message, fn);
export const When = (message: string, fn: SuiteFactory | undefined) => describe("When " + message, fn);
export const Then = (message: string, fn: TestFunction | undefined): void => {
  it("Then " + message, fn);
};
export const And = (message: string, fn: SuiteFactory | undefined) => describe("And " + message, fn);
