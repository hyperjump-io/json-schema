import type { OutputFormat } from "./core.js";


export const setMetaSchemaOutputFormat: (format: OutputFormat) => void;
export const getMetaSchemaOutputFormat: () => OutputFormat;
export const setShouldValidateSchema: (isEnabled: boolean) => void;
export const getShouldValidateSchema: () => boolean;
export const setExperimentalKeywordEnabled: (keywordId: string, isEnabled: boolean) => void;
export const isExperimentalKeywordEnabled: (keywordId: string) => boolean;
