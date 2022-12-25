import type { OutputFormat } from "./core.js";


export const setMetaOutputFormat: (format: OutputFormat) => void;
export const getMetaOutputFormat: () => OutputFormat;
export const setShouldMetaValidate: (isEnabled: boolean) => void;
export const getShouldMetaValidate: () => boolean;
export const setUnstableKeywordEnabled: (keywordId: string, isEnabled: boolean) => void;
export const isUnstableKeywordEnabled: (keywordId: string) => boolean;
