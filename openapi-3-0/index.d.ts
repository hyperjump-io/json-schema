import type { Json } from "@hyperjump/json-pointer";
import type { JsonSchemaType } from "../lib/common.js";


export type OasSchema30 = {
  $ref: string;
} | {
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
  items?: OasSchema30;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  additionalProperties?: boolean | OasSchema30;
  properties?: Record<string, OasSchema30>;
  enum?: Json[];
  type?: JsonSchemaType;
  nullable?: boolean;
  format?: "date-time" | "email" | "hostname" | "ipv4" | "ipv6" | "uri" | "int32" | "int64" | "float" | "double" | "byte" | "binary" | "date" | "password";
  allOf?: OasSchema30[];
  anyOf?: OasSchema30[];
  oneOf?: OasSchema30[];
  not?: OasSchema30;
  example: Json;
  discriminator: Discriminator;
  externalDocs: ExternalDocs;
  xml: Xml;
};

type Discriminator = {
  propertyName: string;
  mappings: Record<string, string>;
};

type ExternalDocs = {
  url: string;
  description: string;
};

type Xml = {
  name: string;
  namespace: string;
  prefix: string;
  attribute: boolean;
  wrapped: boolean;
};

export * from "../lib/index.js";
