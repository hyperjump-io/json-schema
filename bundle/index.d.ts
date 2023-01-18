import type { SchemaObject } from "../lib/schema.js";


export const bundle: <A = SchemaObject>(uri: string, options?: BundleOptions) => Promise<A>;
export const FULL: "full";
export const FLAT: "flat";
export const URI: "uri";
export const UUID: "uuid";

export type BundleOptions = {
  alwaysIncludeDialect?: boolean;
  bundleMode?: BundleMode;
  definitionNamingStrategy?: DefinitionNamingStrategy;
  externalSchemas?: string[];
};

export type BundleMode = "full" | "flat";
export type DefinitionNamingStrategy = "uri" | "uuid";
