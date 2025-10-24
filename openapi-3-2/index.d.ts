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
  defaultMapping?: string;
};

type ExternalDocs = {
  url: string;
  description?: string;
};

type Xml = {
  nodeType?: "element" | "attribute" | "text" | "cdata" | "none";
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
};

export type OpenApi = {
  openapi: string;
  $self?: string;
  info: Info;
  jsonSchemaDialect?: string;
  servers?: Server[];
  paths?: Record<string, PathItem>;
  webhooks?: Record<string, PathItem>;
  components?: Components;
  security?: SecurityRequirement[];
  tags?: Tag[];
  externalDocs?: ExternalDocs;
};

type Info = {
  title: string;
  summary?: string;
  description?: string;
  termsOfService?: string;
  contact?: Contact;
  license?: License;
  version: string;
};

type Contact = {
  name?: string;
  url?: string;
  email?: string;
};

type License = {
  name: string;
  identifier?: string;
  url?: string;
};

type ServerVariable = {
  enum?: string[];
  default: string;
  description?: string;
};

type PathItem = {
  $ref?: string;
  summary?: string;
  description?: string;
  get?: Operation;
  put?: Operation;
  post?: Operation;
  delete?: Operation;
  options?: Operation;
  head?: Operation;
  patch?: Operation;
  trace?: Operation;
  query?: Operation;
  additionOperations?: Record<string, Operation>;
  servers?: Server[];
  parameters?: (Parameter | Reference)[];
};

type Operation = {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: ExternalDocs;
  operationId?: string;
  parameters?: (Parameter | Reference)[];
  requestBody?: RequestBody | Reference;
  responses?: Responses;
  callbacks?: Record<string, Callbacks | Reference>;
  deprecated?: boolean;
  security?: SecurityRequirement[];
  servers?: Server[];
};

// TODO: Needs improvement
type Parameter = {
  name: string;
  in: "query" | "querystring" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
} & Examples & ({
  style?: "matrix" | "label" | "form" | "simple" | "spaceDelimited" | "pipeDelimited" | "deepObject";
  explode?: boolean;
  schema: OasSchema32;
} | {
  content: Record<string, MediaType | Reference>;
});

// TODO: Needs improvement
type Example = {
  summary?: string;
  description?: string;
  dataValue?: Json;
  serializedValue?: string;
  externalValue?: string;
  value?: Json;
};

type Examples = {
  example?: Json;
  examples?: Record<string, Example | Reference>;
};

type Reference = {
  $ref: string;
  summary?: string;
  description?: string;
};

type RequestBody = {
  description?: string;
  content: Record<string, MediaType | Reference>;
  required?: boolean;
};

type MediaType = {
  schema?: OasSchema32;
  itemSchema?: OasSchema32;
  encoding?: Record<string, Encoding>;
  prefixEncoding?: Encoding[];
  itemEncoding?: Encoding;
} & Examples;

// TODO: Needs improvement
type Encoding = {
  contentType?: string;
  headers?: Record<string, Header | Reference>;
  encoding?: Record<string, Encoding>;
  prefixEncoding?: Encoding[];
  itemEncoding?: Encoding;
  style?: "form" | "spaceDelimited" | "pipeDelimited" | "deepObject";
  explode?: boolean;
  allowReserved?: boolean;
};

type Header = {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
} & Examples & ({
  style?: "simple";
  explode?: boolean;
  schema: OasSchema32;
} | {
  content: Record<string, MediaType | Reference>;
});

type Responses = {
  default?: Response | Reference;
} & Record<string, Response | Reference>;

type Response = {
  summary?: string;
  description?: string;
  headers?: Record<string, Header | Reference>;
  content?: Record<string, MediaType | Reference>;
  links?: Record<string, Link | Reference>;
};

type Callbacks = Record<string, PathItem | Reference>;

type SecurityRequirement = Record<string, string[]>;

type Server = {
  url: string;
  description?: string;
  name?: string;
  variables?: Record<string, ServerVariable>;
};

type Components = {
  schemas?: Record<string, OasSchema32>;
  responses?: Record<string, Response | Reference>;
  parameters?: Record<string, Parameter | Reference>;
  examples?: Record<string, Example | Reference>;
  requestBodies?: Record<string, RequestBody | Reference>;
  headers?: Record<string, Header | Reference>;
  securitySchemes?: Record<string, SecurityScheme | Reference>;
  links?: Record<string, Link | Reference>;
  callbacks?: Record<string, Callbacks | Reference>;
  pathItems?: Record<string, PathItem>;
  mediaTypes?: Record<string, MediaType | Reference>;
};

// TODO: Needs improvement
type SecurityScheme = {
  type: "apiKey" | "http" | "mutualTLS" | "oauth2" | "openIdConnect";
  description?: string;
  name?: string;
  in?: "query" | "header" | "cookie";
  scheme?: string;
  bearerFormat?: string;
  flows?: OAuthFlows;
  openIdConnectUrl?: string;
  oauth2MetadataUrl?: string;
  deprecated?: boolean;
};

type OAuthFlows = {
  implicit?: Implicit;
  password?: Password;
  clientCredentials?: ClientCredentials;
  authorizationCode?: AuthorizationCode;
  deviceAuthorization?: DeviceAuthorization;
};

type Implicit = {
  authorizationUrl: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
};

type Password = {
  tokenUrl: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
};

type ClientCredentials = {
  tokenUrl: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
};

type AuthorizationCode = {
  authorizationUrl: string;
  tokenUrl: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
};

type DeviceAuthorization = {
  deviceAuthorizationUrl: string;
  tokenUrl: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
};

type Link = {
  operationRef?: string;
  operationId?: string;
  parameters?: Record<string, string>;
  requestBody?: Json;
  description?: string;
  server?: Server;
};

type Tag = {
  name: string;
  summary?: string;
  description?: string;
  externalDocs?: ExternalDocs;
  parent?: string;
  kind?: string;
};

export * from "../lib/index.js";
