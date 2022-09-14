import type { Json } from "@hyperjump/json-pointer";
import type { AST } from "./core";
import type { JsonDocument } from "./instance";
import type { SchemaDocument, Anchors } from "./schema";


export type Keywords = {
  addKeyword: (id: string, keywordHandler: Keyword) => void;
  getKeywordId: (dialectId: string, keyword: string) => string;
  getKeywordName: (schema: SchemaDocument, keywordId: string) => string;
  getKeyword: <A>(id: string) => {
    compile: Compile<A>;
    interpret: Interpret<A>;
    collectEvaluatedProperties: CollectEvaluatedProperties<A>;
    collectEvaluatedItems: CollectEvaluatedItems<A>;
  };
  defineVocabulary: (id: string, keywords: { [keyword: string]: string }) => void;
  hasDialect: (dialectId: string) => boolean;
  loadDialect: (dialectId: string, dialect: Dialect, allowUnknownKeyword: boolean) => void;
  duplicateDialect: (toDialectId: string, FromDialectId: string) => void;
};

export type Keyword<A extends Json | undefined = Json> = {
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

declare const keywords: Keywords;
export default keywords;
