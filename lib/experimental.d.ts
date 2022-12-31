import type { Keyword } from "./keywords.js";


export { compile, interpret, BASIC, DETAILED, VERBOSE } from "./core.js";
export { isExperimentalKeywordEnabled, setExperimentalKeywordEnabled } from "./configuration.js";
export { getKeyword, addKeyword, defineVocabulary, getKeywordName, loadDialect } from "./keywords.js";
export type { Keyword } from "./keywords.js";
export const Validate: Keyword<string>;
