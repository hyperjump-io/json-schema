import type { SchemaObject } from "./schema.js";
import type { Response } from "undici";


export const addMediaTypePlugin: (contentType: string, plugin: MediaTypePlugin) => void;

export type MediaTypePlugin = {
  parse: (response: Response, mediaTypeParameters: { [parameter: string]: string }) => Promise<[SchemaObject, string | undefined]>;
  matcher: (path: string) => boolean;
  quality?: string;
};
