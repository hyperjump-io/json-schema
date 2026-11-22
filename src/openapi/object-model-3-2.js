/**
 * @import { ObjectModel } from "./object-model.d.ts"
 */

/**
 * The Objects of OpenAPI 3.2 that lead to Schema Objects. It's 3.1's, with
 * the `query` operation and `additionalOperations`, the Media Type
 * Object's `itemSchema` and positional encodings, nested encodings, and
 * the Components Object's `mediaTypes`.
 *
 * @type ObjectModel
 */
export const objectModel32 = {
  OpenAPI: { paths: "Paths", webhooks: { map: "PathItem" }, components: "Components" },
  Paths: { "*": "PathItem" },
  PathItem: {
    get: "Operation",
    put: "Operation",
    post: "Operation",
    delete: "Operation",
    options: "Operation",
    head: "Operation",
    patch: "Operation",
    trace: "Operation",
    query: "Operation",
    additionalOperations: { map: "Operation" },
    parameters: { array: "Parameter" }
  },
  Operation: {
    parameters: { array: "Parameter" },
    requestBody: "RequestBody",
    responses: "Responses",
    callbacks: { map: "Callback" }
  },
  Callback: { "*": "PathItem" },
  Responses: { "*": "Response" },
  Response: { headers: { map: "Header" }, content: { map: "MediaType" } },
  RequestBody: { content: { map: "MediaType" } },
  Parameter: { schema: "Schema", content: { map: "MediaType" } },
  Header: { schema: "Schema", content: { map: "MediaType" } },
  MediaType: {
    schema: "Schema",
    itemSchema: "Schema",
    encoding: { map: "Encoding" },
    prefixEncoding: { array: "Encoding" },
    itemEncoding: "Encoding"
  },
  Encoding: {
    headers: { map: "Header" },
    encoding: { map: "Encoding" },
    prefixEncoding: { array: "Encoding" },
    itemEncoding: "Encoding"
  },
  Components: {
    schemas: { map: "Schema" },
    responses: { map: "Response" },
    parameters: { map: "Parameter" },
    requestBodies: { map: "RequestBody" },
    headers: { map: "Header" },
    callbacks: { map: "Callback" },
    pathItems: { map: "PathItem" },
    mediaTypes: { map: "MediaType" }
  }
};
