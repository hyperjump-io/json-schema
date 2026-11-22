import { mediaTypeForContentType, relativeFileUrl } from "@hyperjump/browser";

/**
 * @import * as API from "./index.d.ts"
 */

/** Where OpenAPI publishes its dialects' meta-schemas and its documents' schemas */
const specUrl = "https://spec.openapis.org/oas/";

/** @type typeof API.openApiSpecMediaType */
export const openApiSpecMediaType = Object.freeze({
  mediaType: "application/octet-stream",
  extensions: [],

  /** @type typeof API.openApiSpecMediaType.parse */
  parse: async (response, session) => {
    // A media type plugin is chosen by its media type, so it can't be for a
    // URL. Anything else is refused the way it would be without this plugin.
    const schemaMediaType = response.url.startsWith(specUrl)
      ? mediaTypeForContentType(session.config.mediaTypes ?? [], "application/schema+json")
      : undefined;
    if (schemaMediaType === undefined) {
      const error = Error(`'${relativeFileUrl(response.url)}' can't be used, because no media type parses its 'Content-Type', which is 'application/octet-stream'. Use 'mediaTypes' to add support for a media type.`, { cause: { code: "ERR_UNSUPPORTED_MEDIA_TYPE" } });
      throw Object.assign(error, { url: response.url });
    }

    return /** @type any */ (schemaMediaType.parse(response, session));
  }
});
