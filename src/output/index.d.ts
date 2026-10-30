import type { BasicOutput, DetailedOutput, OutputFormat } from "./output-format.d.ts";

export type * from "./output-format.d.ts";

/**
 * Only whether the instance is valid. It's the default, and the fastest:
 * code that only uses it never loads what the other formats need.
 */
export const FLAG: OutputFormat<boolean>;

/** A flat list of every error. See {@link BasicOutput}. */
export const BASIC: OutputFormat<BasicOutput>;

/** Errors nested by schema structure. See {@link DetailedOutput}. */
export const DETAILED: OutputFormat<DetailedOutput>;
