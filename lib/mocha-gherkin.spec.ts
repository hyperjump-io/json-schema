import type { Suite, Test, Func } from "mocha";


type SuiteFunc = (this: Suite) => void;

export const Given = (message: string, fn: SuiteFunc): Suite => describe("Given " + message, fn);
export const When = (message: string, fn: SuiteFunc): Suite => describe("When " + message, fn);
export const Then = (message: string, fn: Func): Test => it("Then " + message, fn);
export const And = (message: string, fn: SuiteFunc): Suite => describe("And " + message, fn);
