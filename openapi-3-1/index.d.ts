import type { Json } from "@hyperjump/json-pointer";
import type { JsonSchemaType } from "../lib/common.js";


export type OasSchema31 = boolean | {
  $schema?: "https://json-schema.org/draft/2020-12/schema";
  $id?: string;
  $anchor?: string;
  $ref?: string;
  $dynamicRef?: string;
  $dynamicAnchor?: string;
  $vocabulary?: Record<string, boolean>;
  $comment?: string;
  $defs?: Record<string, OasSchema31>;
  additionalItems?: OasSchema31;
  unevaluatedItems?: OasSchema31;
  prefixItems?: OasSchema31[];
  items?: OasSchema31;
  contains?: OasSchema31;
  additionalProperties?: OasSchema31;
  unevaluatedProperties?: OasSchema31;
  properties?: Record<string, OasSchema31>;
  patternProperties?: Record<string, OasSchema31>;
  dependentSchemas?: Record<string, OasSchema31>;
  propertyNames?: OasSchema31;
  if?: OasSchema31;
  then?: OasSchema31;
  else?: OasSchema31;
  allOf?: OasSchema31[];
  anyOf?: OasSchema31[];
  oneOf?: OasSchema31[];
  not?: OasSchema31;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxContains?: number;
  minContains?: number;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  dependentRequired?: Record<string, string[]>;
  const?: Json;
  enum?: Json[];
  type?: JsonSchemaType | JsonSchemaType[];
  title?: string;
  description?: string;
  default?: Json;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  examples?: Json[];
  format?: "date-time" | "date" | "time" | "duration" | "email" | "idn-email" | "hostname" | "idn-hostname" | "ipv4" | "ipv6" | "uri" | "uri-reference" | "iri" | "iri-reference" | "uuid" | "uri-template" | "json-pointer" | "relative-json-pointer" | "regex";
  contentMediaType?: string;
  contentEncoding?: string;
  contentSchema?: OasSchema31;
  example?: Json;
  discriminator?: Discriminator;
  externalDocs?: ExternalDocs;
  xml?: Xml;
};

type Discriminator = {
  propertyName: string;
  mappings?: Record<string, string>;
};

type ExternalDocs = {
  url: string;
  description?: string;
};

type Xml = {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
};

export * from "../lib/index.js";
