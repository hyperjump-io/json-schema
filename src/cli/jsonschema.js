import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { unified } from "unified";
import { rejsonParse, rejsonStringify } from "@hyperjump/browser/json";
import { JsonSchema } from "../json-schema.js";
import { SchemaRegistry } from "../registry/schema-registry.js";
import { jsonSchemaResolve } from "../schema/resolve.js";
import { defaultAllowRetrieval } from "../retrieval/allow-retrieval.js";
import { addV1 } from "../dialects/v1/index.js";
import { addDraft04 } from "../dialects/draft-04/index.js";
import { addDraft06 } from "../dialects/draft-06/index.js";
import { addDraft07 } from "../dialects/draft-07/index.js";
import { addDraft201909 } from "../dialects/draft-2019-09/index.js";
import { addDraft202012 } from "../dialects/draft-2020-12/index.js";

/**
 * @import { Processor, Transformer } from "unified"
 * @import { VFile } from "vfile"
 * @import { JsonDocumentNode } from "@hyperjump/browser/json"
 * @import { AllowRetrieval } from "../json-schema.d.ts"
 * @import { JsonSchemaDocumentNode } from "../schema/schema-ast.d.ts"
 */

/**
 * The part of the engine's file set the CLI uses
 *
 * @typedef {{ files: VFile[] }} FileSet
 */

/**
 * Every file shares a `JsonSchema`. Each one's session says what it can
 * retrieve, because files in different folders can have different settings.
 */
const jsonSchema = new JsonSchema();
addV1(jsonSchema);
addDraft04(jsonSchema);
addDraft06(jsonSchema);
addDraft07(jsonSchema);
addDraft201909(jsonSchema);
addDraft202012(jsonSchema);

/** @type WeakMap<Processor, FileSet> */
const fileSets = new WeakMap();

/**
 * Record the engine's file set for a processor. `file-set.js` is the plugin
 * that calls it.
 *
 * @type (processor: Processor, fileSet: FileSet) => void
 */
export const recordFileSet = (processor, fileSet) => {
  fileSets.set(processor, fileSet);
};

/**
 * The paths of every file the CLI has been given. In watch mode, a run only
 * has the file that changed, so the files from earlier runs are kept.
 *
 * @type Set<string>
 */
const givenPaths = new Set();

/**
 * Each run's registry of the files the CLI has been given
 *
 * @type WeakMap<FileSet, Promise<SchemaRegistry>>
 */
const registries = new WeakMap();

/**
 * Without the engine, such as when the processor is used directly, there
 * are no files
 *
 * @type FileSet
 */
const noFiles = { files: [] };

/**
 * Files are read again for each run, so the registry has what they are now.
 * Files that can't be read anymore are left out.
 *
 * @type (fileSet: FileSet) => Promise<SchemaRegistry>
 */
const createRegistry = async (fileSet) => {
  for (const file of fileSet.files) {
    // A file the engine couldn't find or was told to ignore has a fatal
    // message already. Input from stdin has no path.
    if (file.path !== undefined && !file.messages.some((message) => message.fatal)) {
      givenPaths.add(resolve(file.cwd, file.path));
    }
  }

  const entries = [];
  for (const path of givenPaths) {
    try {
      entries.push({ schema: await readFile(path, "utf8"), retrievalUri: pathToFileURL(path).href });
    } catch {
      // It was given, but it's gone
    }
  }

  return new SchemaRegistry(entries);
};

/** @type (fileSet: FileSet) => Promise<SchemaRegistry> */
const registryFor = (fileSet) => {
  let registry = registries.get(fileSet);
  if (!registry) {
    registry = createRegistry(fileSet);
    registries.set(fileSet, registry);
  }

  return registry;
};

/**
 * The `allowRetrieval` setting is a list of `http(s):` URLs. One that ends
 * with `/` allows everything under it. Any other allows only itself. Files
 * can't be allowed this way, because a configuration file that's committed
 * can't name a path outside the project, and a relative one has nothing to
 * be relative to (the engine doesn't say which configuration file a setting
 * came from). A file outside the working directory is found through the
 * registry instead.
 *
 * @type (setting: unknown) => string[]
 */
const allowedUrls = (setting) => {
  if (setting === undefined) {
    return [];
  } else if (!Array.isArray(setting) || setting.some((entry) => typeof entry !== "string")) {
    throw Error("The 'allowRetrieval' setting must be a list of URLs");
  }

  return setting.map((/** @type string */ entry) => {
    let url;
    try {
      url = new URL(entry);
    } catch {
      throw Error(`'${entry}' in the 'allowRetrieval' setting isn't an absolute URL`);
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw Error(`'${entry}' in the 'allowRetrieval' setting isn't an 'http:' or 'https:' URL. Files outside the working directory can only be found through the registry.`);
    }

    url.hash = "";
    return url.href;
  });
};

/** @type (allowed: string, url: URL) => boolean */
const isAllowedBy = (allowed, url) => allowed.endsWith("/") ? url.href.startsWith(allowed) : url.href === allowed;

/**
 * What a file's session can retrieve: files in the working directory, as
 * by default, and the URLs its `allowRetrieval` setting allows. Without
 * any, it's the default.
 *
 * @type (allowed: string[]) => AllowRetrieval | undefined
 */
const allowRetrievalFor = (allowed) => {
  if (allowed.length === 0) {
    return;
  }

  return (url) => allowed.some((entry) => isAllowedBy(entry, url)) || defaultAllowRetrieval(url);
};

/**
 * Resolves a schema, which finds every problem with it. Each file is
 * resolved in its own session, with a registry of every file the CLI was
 * given, so references and meta-schemas find the other files by their
 * identifiers, or by their paths if they don't have one. What can be
 * retrieved is files in the working directory and the URLs the
 * `allowRetrieval` setting allows.
 *
 * Input from stdin has no path. It's resolved as if it were in the working
 * directory, so relative identifiers and references resolve against it.
 *
 * @this {Processor}
 * @returns {Transformer<JsonDocumentNode, JsonSchemaDocumentNode>}
 */
function jsonSchemaLint() {
  const processor = this;
  return async (tree, file) => {
    const settings = /** @type {{ allowRetrieval?: unknown }} */ (processor.data("settings") ?? {});
    let allowed;
    try {
      allowed = allowedUrls(settings.allowRetrieval);
    } catch (error) {
      return file.fail(/** @type Error */ (error).message, { ruleId: "invalid-setting", source: "jsonschema" });
    }

    const registry = await registryFor(fileSets.get(processor) ?? noFiles);
    const session = jsonSchema.session({ registries: [registry], allowRetrieval: allowRetrievalFor(allowed) });
    const uri = file.path === undefined ? pathToFileURL(`${file.cwd}/`).href : undefined;
    return /** @type Function */ (jsonSchemaResolve).call(this, { session, uri })(tree, file);
  };
}

/**
 * Lints schemas. Syntax errors are reported without failing the file, so the
 * rest of the schema is still checked.
 */
export const jsonschema = unified()
  .use(rejsonParse, { accept: "recovered" })
  .use(jsonSchemaLint)
  .use(rejsonStringify)
  .freeze();
