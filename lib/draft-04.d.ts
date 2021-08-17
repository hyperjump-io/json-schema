import type { Json, JsonType } from "@hyperjump/json-schema-core";


export type Draft04Schema = {
  $ref: string;
} | {
  $schema?: "http://json-schema.org/draft-04/schema#";
  id?: string;
  title?: string;
  description?: string;
  default?: Json;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  additionalItems?: boolean | Draft04Schema;
  items?: Draft04Schema | Draft04Schema[];
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  additionalProperties?: boolean | Draft04Schema;
  definitions?: Record<string, Draft04Schema>;
  properties?: Record<string, Draft04Schema>;
  patternProperties?: Record<string, Draft04Schema>;
  dependencies?: Record<string, Draft04Schema | string[]>;
  enum?: Json[];
  type?: JsonType | JsonType[];
  format?: "date-time" | "email" | "hostname" | "ipv4" | "ipv6" | "uri";
  allOf?: Draft04Schema[];
  anyOf?: Draft04Schema[];
  oneOf?: Draft04Schema[];
  not?: Draft04Schema;
};
