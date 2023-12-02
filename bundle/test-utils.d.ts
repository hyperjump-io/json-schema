import type { Json } from "@hyperjump/json-pointer";
import type { SchemaObject } from "../lib/index.js";


type TestCase = {
  description: string;
  compatibility?: string;
  requiredDialects?: string[];
  schema: SchemaObject;
  externalSchemas: Record<string, SchemaObject>;
  tests: Test[];
};

type Test = {
  description: string,
  instance: Json
};

export const testSuite: (path: string) => TestCase[];
export const md5: (subject: string) => string;
export const isCompatible: (compatibility: string | undefined, versionUnderTest: number) => boolean;
export const loadSchemas: (testCase: TestCase, retrievalUri: string, dialect: string) => void;
export const unloadSchemas: (testCase: TestCase, retrievalUri: string, dialect: string) => void;
