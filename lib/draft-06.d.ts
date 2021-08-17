import type { Json, JsonType } from "@hyperjump/json-schema-core";


export type Draft06Schema = boolean | {
  $ref: string;
} | {
  $schema?: "http://json-schema.org/draft-06/schema#";
  $id?: string;
  title?: string;
  description?: string;
  default?: Json;
  examples?: Json[];
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  additionalItems?: Draft06Schema;
  items?: Draft06Schema | Draft06Schema[];
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  contains?: Draft06Schema;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  additionalProperties?: Draft06Schema;
  definitions?: Record<string, Draft06Schema>;
  properties?: Record<string, Draft06Schema>;
  patternProperties?: Record<string, Draft06Schema>;
  dependencies?: Record<string, Draft06Schema | string[]>;
  propertyNames?: Draft06Schema;
  const?: Json;
  enum?: Json[];
  type?: JsonType | JsonType[];
  format?: "date-time" | "email" | "hostname" | "ipv4" | "ipv6" | "uri" | "uri-reference" | "uri-template" | "json-pointer";
  allOf?: Draft06Schema[];
  anyOf?: Draft06Schema[];
  oneOf?: Draft06Schema[];
  not?: Draft06Schema;
};
