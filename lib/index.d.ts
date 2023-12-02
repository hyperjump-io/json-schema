export type SchemaFragment = string | number | boolean | null | SchemaObject | SchemaFragment[];
export type SchemaObject = {
  [keyword: string]: SchemaFragment;
};

export const registerSchema: (schema: SchemaObject | boolean, retrievalUri?: string, contextDialectId?: string) => void;
export const unregisterSchema: (retrievalUri: string) => void;

/**
 * @deprecated since 1.7.0. Use registerSchema instead.
 */
export const addSchema: typeof registerSchema;

export const validate: (
  (url: string, value: unknown, outputFormat?: OutputFormat) => Promise<OutputUnit>
) & (
  (url: string) => Promise<Validator>
);

export type Validator = (value: unknown, outputFormat?: OutputFormat) => OutputUnit;

export type OutputUnit = {
  keyword: string;
  absoluteKeywordLocation: string;
  instanceLocation: string;
  valid: boolean;
  errors?: OutputUnit[];
};

export const FLAG: "FLAG";

export type OutputFormat = "FLAG" | "BASIC" | "DETAILED" | "VERBOSE";

export const setMetaSchemaOutputFormat: (format: OutputFormat) => void;
export const getMetaSchemaOutputFormat: () => OutputFormat;
export const setShouldValidateSchema: (isEnabled: boolean) => void;
export const getShouldValidateSchema: () => boolean;

export class InvalidSchemaError extends Error {
  public output: OutputUnit;

  public constructor(output: OutputUnit);
}
