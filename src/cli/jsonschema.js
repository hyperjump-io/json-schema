import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { cwd } from "node:process";
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
 * Each run's registry
 *
 * @type WeakMap<FileSet, Promise<SchemaRegistry>>
 */
const registries = new WeakMap();

/**
 * Without the engine, such as when the processor is used directly, there's
 * no run, so nothing is in the registry
 */
const noRegistry = Promise.resolve(new SchemaRegistry());

/** Directories that are never searched for schemas */
const skippedDirectories = new Set(["node_modules", ".git"]);

/**
 * Every schema file in a directory and the directories in it. Symlinks are
 * skipped, because one can point outside the working directory, and what's
 * in the registry isn't checked by `allowRetrieval`. A directory that can't
 * be read is skipped.
 *
 * @type (directory: string) => Promise<string[]>
 */
const schemaFiles = async (directory) => {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  /** @type string[] */
  const paths = [];
  /** @type Promise<string[]>[] */
  const directories = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && !skippedDirectories.has(entry.name)) {
      directories.push(schemaFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".schema.json")) {
      paths.push(path);
    }
  }

  return paths.concat(...await Promise.all(directories));
};

/**
 * How many files are read at once. Reading them all at once could run out
 * of file descriptors.
 */
const readConcurrency = 64;

/**
 * Read files with up to `readConcurrency` at once, keeping their order.
 * A file that can't be read is undefined.
 *
 * @type (paths: string[]) => Promise<(string | undefined)[]>
 */
const readFiles = async (paths) => {
  /** @type (string | undefined)[] */
  const texts = [];
  let next = 0;
  const worker = async () => {
    while (next < paths.length) {
      const index = next++;
      try {
        texts[index] = await readFile(paths[index], "utf8");
      } catch {
        texts[index] = undefined;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(readConcurrency, paths.length) }, worker));

  return texts;
};

/**
 * The registry has every schema file in the working directory, whether or
 * not it's linted, as a language server has its workspace, so a schema can
 * find a meta-schema that's ignored by its `$id`. It also has the files the
 * CLI was given, which can be outside the working directory or have another
 * extension.
 *
 * The working directory is searched and files are read again for each run,
 * so the registry has what they are now. Files that can't be read anymore
 * are left out.
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

  const paths = [...new Set([...await schemaFiles(cwd()), ...givenPaths])];
  const texts = await readFiles(paths);
  const entries = [];
  for (const [index, text] of texts.entries()) {
    // A file that can't be read is gone
    if (text !== undefined) {
      entries.push({ schema: text, retrievalUri: pathToFileURL(paths[index]).href });
    }
  }

  return new SchemaRegistry(entries);
};

/** @type (fileSet: FileSet | undefined) => Promise<SchemaRegistry> */
const registryFor = (fileSet) => {
  if (fileSet === undefined) {
    return noRegistry;
  }

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
 * resolved in its own session, with a registry of every schema file in the
 * working directory and every file the CLI was given, so references and
 * meta-schemas find them by their identifiers or paths. What can be
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

    const registry = await registryFor(fileSets.get(processor));
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
