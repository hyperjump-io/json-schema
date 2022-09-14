import type { OutputFormat } from "./core";


export type Configuration = {
  setMetaOutputFormat: (format: OutputFormat) => void;
  getMetaOutputFormat: () => OutputFormat;
  setShouldMetaValidate: (isEnabled: boolean) => void;
  getShouldMetaValidate: () => boolean;
  setUnstableKeywordEnabled: (keywordId: string, isEnabled: boolean) => void;
  isUnstableKeywordEnabled: (keywordId: string) => boolean;
};

declare const configuration: Configuration;
export default configuration;
