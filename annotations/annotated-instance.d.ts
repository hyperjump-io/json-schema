export const setAnnotation: (keywordUri: string, schemaLocation: string, value: string) => void;
export const annotation: <A>(instance: JsonNode, keyword: string, dialectUri?: string) => A[];
export const annotatedWith: (instance: JsonNode, keyword: string, dialectUri?: string) => JsonNode[];

export * from "../lib/instance.js";
