export const annotation: <A>(instance: JsonNode, keyword: string, dialectUri?: string) => A[];
export const annotatedWith: <A extends JsonNode>(instance: A, keyword: string, dialectUri?: string) => A[];

export * from "../lib/instance.js";
