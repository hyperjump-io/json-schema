import type { Json } from "@hyperjump/json-pointer";
import type { EvaluationPlugin } from "./experimental.js";


export type SchemaFragment = string | number | boolean | null | SchemaObject | SchemaFragment[];
export type SchemaObject = {
  [keyword: string]: SchemaFragment;
};

export const registerSchema: (schema: SchemaObject | boolean, retrievalUri?: string, contextDialectId?: string) => void;
export const unregisterSchema: (retrievalUri: string) => void;
export const hasSchema: (uri: string) => boolean;
export const getAllRegisteredSchemaUris: () => string[];

/**
 * @deprecated since 1.7.0. Use registerSchema instead.
 */
export const addSchema: typeof registerSchema;

/**
 * Options for validation. Packages that add an output format can add options
 * for it by augmenting this interface.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- An interface so it can be augmented
export interface ValidationOptions<F extends OutputFormat = OutputFormat> {
  outputFormat?: F;
  plugins?: EvaluationPlugin[];
}

export const validate: (
  <F extends OutputFormat = "FLAG">(url: string, value: Json, options?: F | ValidationOptions<F>) => Promise<OutputFormats[F]>
) & (
  (url: string) => Promise<Validator>
);

export const restoreValidator: (json: string) => Validator;

export type Validator = {
  <F extends OutputFormat = "FLAG">(value: Json, options?: F | ValidationOptions<F>): OutputFormats[F];
  serialize(): string;
};

export type Output = {
  valid: true;
} | {
  valid: false;
  errors?: OutputUnit[];
};

export type OutputUnit = {
  keyword: string;
  absoluteKeywordLocation: string;
  instanceLocation: string;
  valid: boolean;
  annotation?: unknown;
  errors?: OutputUnit[];
};

export const FLAG: "FLAG";

/**
 * The output type of each output format. Packages that add an output format with
 * `setOutputFormat` can add its output type by augmenting this interface.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- An interface so it can be augmented
export interface OutputFormats {
  FLAG: Output;
  BASIC: Output;
  DETAILED: Output;
}

export type OutputFormat = keyof OutputFormats;

export const setMetaSchemaOutputFormat: (format: OutputFormat) => void;
export const getMetaSchemaOutputFormat: () => OutputFormat;
export const setShouldValidateSchema: (isEnabled: boolean) => void;
export const getShouldValidateSchema: () => boolean;
export const setShouldValidateFormat: (isEnabled: boolean | undefined) => void;
export const getShouldValidateFormat: () => boolean | undefined;

export class InvalidSchemaError extends Error {
  public output: Output & { valid: false };

  public constructor(output: Output);
}
