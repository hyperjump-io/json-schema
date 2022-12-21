import contentTypeParser from "content-type";


const mediaTypePlugins = {};

export const addMediaTypePlugin = (contentType, plugin) => {
  mediaTypePlugins[contentType] = plugin;
};

export const parse = (response) => {
  const contentType = contentTypeParser.parse(response.headers.get("content-type"));
  if (!(contentType.type in mediaTypePlugins)) {
    throw Error(`${response.url} is not a schema. Found a document with media type: ${contentType.type}`);
  }
  return mediaTypePlugins[contentType.type].parse(response, contentType.parameters);
};

export const getContentType = (path) => {
  for (const contentType in mediaTypePlugins) {
    if (mediaTypePlugins[contentType].matcher(path)) {
      return contentType;
    }
  }

  return "application/octet-stream";
};
