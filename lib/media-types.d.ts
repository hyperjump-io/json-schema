import type { SchemaObject } from "./schema";


export type MediaTypes = {
  addMediaTypePlugin: (contentType: string, plugin: MediaTypePlugin) => void;
};

export type MediaTypePlugin = {
  parse: (response: Response, mediaTypeParameters: { [parameter: string]: string }) => Promise<[SchemaObject, string | undefined]>;
  matcher: (path: string) => boolean;
};

declare const mediatTypes: MediaTypes;
export default mediatTypes;
