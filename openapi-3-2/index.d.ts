import type { Json } from "@hyperjump/json-pointer";
import type { JsonSchemaType } from "../lib/common.js";


export type OasSchema32 = boolean | {
  $schema?: "https://spec.openapis.org/oas/3.2/dialect/base";
  $id?: string;
  $anchor?: string;
  $ref?: string;
  $dynamicRef?: string;
  $dynamicAnchor?: string;
  $vocabulary?: Record<string, boolean>;
  $comment?: string;
  $defs?: Record<string, OasSchema32>;
  additionalItems?: OasSchema32;
  unevaluatedItems?: OasSchema32;
  prefixItems?: OasSchema32[];
  items?: OasSchema32;
  contains?: OasSchema32;
  additionalProperties?: OasSchema32;
  unevaluatedProperties?: OasSchema32;
  properties?: Record<string, OasSchema32>;
  patternProperties?: Record<string, OasSchema32>;
  dependentSchemas?: Record<string, OasSchema32>;
  propertyNames?: OasSchema32;
  if?: OasSchema32;
  then?: OasSchema32;
  else?: OasSchema32;
  allOf?: OasSchema32[];
  anyOf?: OasSchema32[];
  oneOf?: OasSchema32[];
  not?: OasSchema32;
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
  contentSchema?: OasSchema32;
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

// TODO: Fill in this type when 3.2 is published
export type OpenApi32 = unknown;

export * from "../lib/index.js";
