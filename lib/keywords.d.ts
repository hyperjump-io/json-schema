import type { Json } from "@hyperjump/json-pointer";
import type { AST } from "./core.js";
import type { JsonDocument } from "./instance.js";
import type { SchemaDocument, Anchors } from "./schema.js";


export const addKeyword: (keywordHandler: Keyword) => void;
export const getKeywordId: (dialectId: string, keyword: string) => string;
export const getKeywordName: (dialectId: string, keywordId: string) => string;
export const getKeyword: <A>(id: string) => {
  compile: Compile<A>;
  interpret: Interpret<A>;
  collectEvaluatedProperties: CollectEvaluatedProperties<A>;
  collectEvaluatedItems: CollectEvaluatedItems<A>;
};
export const defineVocabulary: (id: string, keywords: { [keyword: string]: string }) => void;
export const hasDialect: (dialectId: string) => boolean;
export const loadDialect: (dialectId: string, dialect: Dialect, allowUnknownKeywords?: boolean) => void;
export const duplicateDialect: (toDialectId: string, FromDialectId: string) => void;

export type Keyword<A extends Json | undefined = Json> = {
  id: string;
  unstable?: boolean;
  compile: Compile<A>;
  interpret: Interpret<A>;
  collectEvaluatedProperties?: CollectEvaluatedProperties<A>;
  collectEvaluatedItems?: CollectEvaluatedItems<A>;
};

export type Compile<A> = (schema: SchemaDocument, ast: AST, parentSchema: SchemaDocument) => Promise<A>;
export type Interpret<A> = (compiledKeywordValue: A, instance: JsonDocument, ast: AST, dynamicAnchors: Anchors) => boolean;
export type CollectEvaluatedProperties<A> = (compiledKeywordValue: A, instance: JsonDocument, ast: AST, dynamicAnchors: Anchors, isTop?: boolean) => string[] | false;
export type CollectEvaluatedItems<A> = (compiledKeywordValue: A, instance: JsonDocument, ast: AST, dynamicAnchors: Anchors, isTop?: boolean) => Set<number> | false;

export type Dialect = {
  [vocabularyId: string]: boolean
};
