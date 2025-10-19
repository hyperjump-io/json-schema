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
export type OpenApi32 = {
  openapi: "3.2.0";
  info: {
    title: string;
    version: string;
    description?: string;
    termsOfService?: string;
    contact?: {
      name?: string;
      url?: string;
      email?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
  };
  servers?: Array<{ url: string; description?: string }>;
  paths?: Record<string, PathItem32>;
  webhooks?: Record<string, PathItem32>; // <-- NEW in 3.2
  components?: Components32;
  security?: SecurityRequirement32[];
  tags?: Tag32[];
  externalDocs?: ExternalDocs32;
};

export type PathItem32 = {
  summary?: string;
  description?: string;
  get?: Operation32;
  put?: Operation32;
  post?: Operation32;
  delete?: Operation32;
  options?: Operation32;
  head?: Operation32;
  patch?: Operation32;
  trace?: Operation32;
  servers?: Array<{ url: string; description?: string }>;
  parameters?: Parameter32[];
};

export type Operation32 = {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: ExternalDocs32;
  operationId?: string;
  parameters?: Parameter32[];
  requestBody?: RequestBody32;
  responses: Record<string, Response32>;
  callbacks?: Record<string, Callback32>;
  deprecated?: boolean;
  security?: SecurityRequirement32[];
  servers?: Array<{ url: string; description?: string }>;
};

export type Components32 = {
  schemas?: Record<string, OasSchema32>;
  responses?: Record<string, Response32>;
  parameters?: Record<string, Parameter32>;
  examples?: Record<string, Example32>;
  requestBodies?: Record<string, RequestBody32>;
  headers?: Record<string, Header32>;
  securitySchemes?: Record<string, SecurityScheme32>;
  links?: Record<string, Link32>;
  callbacks?: Record<string, Callback32>;
};

export type ExternalDocs32 = {
  description?: string;
  url: string;
};

export * from "../lib/index.js";
