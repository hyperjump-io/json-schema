import type { AST } from "./core.js";
import type { JsonDocument } from "./instance.js";
import type { SchemaDocument, Anchors } from "./schema.js";


export const addKeyword: <A>(keywordHandler: Keyword<A>) => void;
export const getKeywordName: (dialectId: string, keywordId: string) => string;
export const getKeyword: <A>(id: string) => Keyword<A>;
export const defineVocabulary: (id: string, keywords: { [keyword: string]: string }) => void;
export const loadDialect: (dialectId: string, dialect: { [vocabularyId: string]: boolean }, allowUnknownKeywords?: boolean) => void;

export type Keyword<A> = {
  id: string;
  experimental?: boolean;
  compile: (schema: SchemaDocument, ast: AST, parentSchema: SchemaDocument) => Promise<A>;
  interpret: (compiledKeywordValue: A, instance: JsonDocument, ast: AST, dynamicAnchors: Anchors) => boolean;
  collectEvaluatedProperties?: (compiledKeywordValue: A, instance: JsonDocument, ast: AST, dynamicAnchors: Anchors, isTop?: boolean) => string[] | false;
  collectEvaluatedItems?: (compiledKeywordValue: A, instance: JsonDocument, ast: AST, dynamicAnchors: Anchors, isTop?: boolean) => Set<number> | false;
};
