/**
 * @import { ObjectModel } from "./object-model.d.ts"
 */

/**
 * The Objects of OpenAPI 3.0 that lead to Schema Objects
 *
 * @type ObjectModel
 */
export const objectModel30 = {
  OpenAPI: { paths: "Paths", components: "Components" },
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
  MediaType: { schema: "Schema", encoding: { map: "Encoding" } },
  Encoding: { headers: { map: "Header" } },
  Components: {
    schemas: { map: "Schema" },
    responses: { map: "Response" },
    parameters: { map: "Parameter" },
    requestBodies: { map: "RequestBody" },
    headers: { map: "Header" },
    callbacks: { map: "Callback" }
  }
};
