import { readdir, readFile } from "node:fs/promises";
import { join, matchesGlob, relative, resolve } from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";
import { unified } from "unified";
import { rejsonParse, rejsonStringify } from "@hyperjump/browser/json";
import { JsonSchema, SchemaRegistry, jsonSchemaResolve, jsonSchemaValidate } from "@hyperjump/json-schema";
import { addV1 } from "@hyperjump/json-schema/v1";
import { addDraft04 } from "@hyperjump/json-schema/draft-04";
import { addDraft06 } from "@hyperjump/json-schema/draft-06";
import { addDraft07 } from "@hyperjump/json-schema/draft-07";
import { addDraft201909 } from "@hyperjump/json-schema/draft-2019-09";
import { addDraft202012 } from "@hyperjump/json-schema/draft-2020-12";
import { addFullFormats } from "@hyperjump/json-schema/formats/full";

/**
 * @import { Position } from "unist"
 * @import { Processor, Transformer } from "unified"
 * @import { VFile } from "vfile"
 * @import { JsonDocumentNode } from "@hyperjump/browser/json"
 * @import { JsonSchemaDocumentNode, JsonSchemaSession, Validator } from "@hyperjump/json-schema"
 */

/**
 * The part of the engine's file set the CLI uses
 *
 * @typedef {{
 *   files: VFile[];
 *   valueOf: () => VFile[];
 *   use: (step: (fileSet: FileSet, next: () => void) => void) => void;
 * }} FileSet
 */

/**
 * Every file shares a `JsonSchema`. Each one's session says what it can
 * retrieve, because files in different folders can have different settings.
 * It has every format JSON Schema defines, so they can be validated and
 * lint rules know what they apply to.
 */
const jsonSchema = new JsonSchema();
addV1(jsonSchema);
addDraft04(jsonSchema);
addDraft06(jsonSchema);
addDraft07(jsonSchema);
addDraft201909(jsonSchema);
addDraft202012(jsonSchema);
addFullFormats(jsonSchema);

/** @type WeakMap<Processor, FileSet> */
const fileSets = new WeakMap();

/**
 * For each file, its messages whose `fatal` is held back until every file
 * is waiting, with a function that sets it (see `holdFatal`)
 *
 * @type WeakMap<VFile, (() => void)[]>
 */
const heldMessages = new WeakMap();

/** @type WeakSet<FileSet> */
const releasingFileSets = new WeakSet();

/**
 * Record the engine's file set for a processor. `file-set.js` is the plugin
 * that calls it, for each file's processor.
 *
 * The engine waits for every file before writing or reporting any of them.
 * While it checks, it skips files with a fatal message, because it assumes
 * they've stopped. A file that gets an error while it's still being
 * transformed can be skipped, so the other files go on without it, and it
 * waits for them forever. The run ends without any output. So errors are
 * held back (see `holdFatal`) and set in a step of the file set's pipeline,
 * which runs once every file is waiting, before anything is reported.
 *
 * @type (processor: Processor, fileSet: FileSet) => void
 */
export const recordFileSet = (processor, fileSet) => {
  fileSets.set(processor, fileSet);

  if (!releasingFileSets.has(fileSet)) {
    releasingFileSets.add(fileSet);
    fileSet.use((fileSet, next) => {
      for (const file of fileSet.valueOf()) {
        // The file's own `message` from its prototype
        delete (/** @type Partial<VFile> */ (file)).message;
        for (const release of heldMessages.get(file) ?? []) {
          release();
        }
        heldMessages.delete(file);
      }
      next();
    });
  }
};

/**
 * Hold back `fatal` on every message added to a file from now on, by the
 * CLI or lint rules, until every file is waiting (see `recordFileSet`).
 * Errors are made by setting `fatal` after a message is added, so it has to
 * be held back as it's set. Until it's released, it reads as a warning.
 *
 * @type (file: VFile) => void
 */
const holdFatal = (file) => {
  if (heldMessages.has(file)) {
    return;
  }

  /** @type (() => void)[] */
  const held = [];
  heldMessages.set(file, held);

  /** @type VFile["message"] */
  const message = (...args) => {
    const vfileMessage = Object.getPrototypeOf(file).message.apply(file, args);
    let fatal = vfileMessage.fatal;
    Object.defineProperty(vfileMessage, "fatal", {
      configurable: true,
      enumerable: true,
      get: () => fatal === true ? false : fatal,
      set: (value) => {
        fatal = value;
      }
    });
    held.push(() => {
      Object.defineProperty(vfileMessage, "fatal", { configurable: true, enumerable: true, writable: true, value: fatal });
    });
    return vfileMessage;
  };
  file.message = message;
};

/**
 * A `.schema.json` file is always a schema. Any other JSON file is a schema
 * if its `$schema` is a dialect (see `isDialect`).
 *
 * @type (path: string) => boolean
 */
const isSchemaFileName = (path) => path.endsWith(".schema.json");

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
 * Every JSON file in a directory and the directories in it. Symlinks are
 * skipped, because one can point outside the working directory, and what's
 * in the registry isn't checked by `allowRetrieval`. A directory that can't
 * be read is skipped.
 *
 * @type (directory: string) => Promise<string[]>
 */
const jsonFiles = async (directory) => {
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
      directories.push(jsonFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
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
 * Whether a URI is a dialect: one that's been added, or one a meta-schema
 * defines, which the session can find
 *
 * @type (session: JsonSchemaSession, uri: string) => Promise<boolean>
 */
const isDialect = async (session, uri) => {
  if (jsonSchema.hasDialect(uri)) {
    return true;
  }

  try {
    await session.getDialect(uri);
    return true;
  } catch {
    return false;
  }
};

/**
 * The top-level `$schema` of JSON text, resolved against its URL. Text that
 * doesn't mention `$schema` isn't parsed, and text that isn't JSON doesn't
 * have one.
 *
 * @type (text: string, url: string) => string | undefined
 */
const dialectUriOf = (text, url) => {
  if (!text.includes(`"$schema"`)) {
    return;
  }

  try {
    const json = /** @type unknown */ (JSON.parse(text));
    if (typeof json === "object" && json !== null && "$schema" in json && typeof json.$schema === "string") {
      return new URL(json.$schema, url).href;
    }
  } catch {
    return;
  }
};

/**
 * The registry has every schema in the working directory, whether or not
 * it's linted, as a language server has its workspace, so a schema can find
 * a meta-schema that's ignored by its `$id`. It also has the schemas the CLI
 * was given, which can be outside the working directory. A JSON file is a
 * schema if it's a `.schema.json` file or its `$schema` is a dialect.
 * Nothing is retrieved to decide, so a dialect has to have been added or be
 * defined by a meta-schema in the registry. A meta-schema can use a dialect
 * another one defines, so files are tried again until no more are schemas.
 * Instances aren't in the registry.
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

  const paths = [...new Set([...await jsonFiles(cwd()), ...givenPaths])];
  const texts = await readFiles(paths);

  /** @type {{ schema: string; retrievalUri: string }[]} */
  const entries = [];

  /** @type {{ entry: { schema: string; retrievalUri: string }; dialectUri: string }[]} */
  let undecided = [];

  for (const [index, text] of texts.entries()) {
    // A file that can't be read is gone
    if (text === undefined) {
      continue;
    }

    const entry = { schema: text, retrievalUri: pathToFileURL(paths[index]).href };
    const dialectUri = dialectUriOf(text, entry.retrievalUri);
    if (isSchemaFileName(paths[index]) || (dialectUri !== undefined && jsonSchema.hasDialect(dialectUri))) {
      entries.push(entry);
    } else if (dialectUri !== undefined) {
      undecided.push({ entry, dialectUri });
    }
  }

  let registry = new SchemaRegistry(entries);
  while (undecided.length > 0) {
    const session = jsonSchema.session({ registries: [registry], allowRetrieval: [] });
    const results = await Promise.all(undecided.map(({ dialectUri }) => isDialect(session, dialectUri)));
    if (!results.includes(true)) {
      break;
    }

    entries.push(...undecided.filter((_, index) => results[index]).map(({ entry }) => entry));
    undecided = undecided.filter((_, index) => !results[index]);
    registry = new SchemaRegistry(entries);
  }

  return registry;
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

/**
 * What each run has worked out, by what a session could retrieve and a URI,
 * so files that ask the same thing share the answer
 *
 * @type WeakMap<FileSet, Map<string, Promise<unknown>>>
 */
const runCaches = new WeakMap();

/**
 * Share what's created for a key with the rest of the run. Without the
 * engine, nothing is shared.
 *
 * @type <T>(fileSet: FileSet | undefined, key: string, create: () => Promise<T>) => Promise<T>
 */
const runCached = (fileSet, key, create) => {
  if (fileSet === undefined) {
    return create();
  }

  let cache = runCaches.get(fileSet);
  if (!cache) {
    cache = new Map();
    runCaches.set(fileSet, cache);
  }

  let value = cache.get(key);
  if (!value) {
    value = create();
    cache.set(key, value);
  }

  return /** @type ReturnType<typeof create> */ (value);
};

/**
 * A new session like each file is resolved or validated in, with the run's
 * registry. It can retrieve files in the working directory, as by default,
 * and the URLs the file's `allowRetrieval` setting allows.
 *
 * @type (fileSet: FileSet | undefined, allowed: string[]) => Promise<JsonSchemaSession>
 */
const sessionFor = async (fileSet, allowed) => jsonSchema.session({
  registries: [await registryFor(fileSet)],
  allowRetrieval: ["./", ...allowed]
});

/**
 * Compile a schema for an instance. Instances that use the same schema
 * compile it once.
 *
 * @type (fileSet: FileSet | undefined, uri: string, allowed: string[]) => Promise<Validator>
 */
const validatorFor = (fileSet, uri, allowed) => runCached(fileSet, JSON.stringify(["validator", allowed, uri]), async () => {
  const session = await sessionFor(fileSet, allowed);
  return session.compile(uri);
});

/**
 * Whether a file's `$schema` is a dialect, which makes it a schema. Unlike
 * the registry, a file's own meta-schema can be retrieved, if its settings
 * allow it. Otherwise, `$schema` names the schema an instance is validated
 * against.
 *
 * @type (fileSet: FileSet | undefined, uri: string, allowed: string[]) => Promise<boolean>
 */
const isDialectFor = (fileSet, uri, allowed) => {
  if (jsonSchema.hasDialect(uri)) {
    return Promise.resolve(true);
  }

  return runCached(fileSet, JSON.stringify(["dialect", allowed, uri]), async () => {
    return isDialect(await sessionFor(fileSet, allowed), uri);
  });
};

/**
 * The `schemas` setting associates instances with schemas. It's an object
 * whose keys are glob patterns, matched against an instance's path relative
 * to the working directory, and whose values are the URI of a schema, or a
 * path relative to the working directory. When several patterns match, the
 * last one wins, so a `.hyperjumprc` in a folder, whose settings are
 * merged after its parents', can change the schema for its files. It's an
 * object rather than a list, because the engine merges lists from different
 * configuration files by index.
 *
 * @type (setting: unknown) => [string, string][]
 */
const schemaAssociations = (setting) => {
  if (setting === undefined) {
    return [];
  } else if (typeof setting !== "object" || setting === null || Array.isArray(setting)
    || Object.values(setting).some((schema) => typeof schema !== "string")) {
    throw Error("The 'schemas' setting must be an object whose keys are glob patterns and whose values are schemas");
  }

  return Object.entries(setting);
};

/**
 * A document's top-level `$schema`, resolved against the file, with its
 * position. Input from stdin is resolved against the working directory. One
 * that isn't a URI reference is ignored.
 *
 * @type (tree: JsonDocumentNode, file: VFile) => { uri: string; place?: Position } | undefined
 */
const schemaProperty = (tree, file) => {
  const node = tree.children[0];
  if (node === undefined || !("jsonType" in node) || node.jsonType !== "object") {
    return;
  }

  const property = node.children.find((property) => property.children[0].value === "$schema");
  const value = property?.children[1];
  if (value === undefined || !("jsonType" in value) || value.jsonType !== "string") {
    return;
  }

  const base = file.path === undefined ? pathToFileURL(`${file.cwd}/`) : pathToFileURL(resolve(file.cwd, file.path));
  try {
    return { uri: new URL(value.value, base).href, place: value.position };
  } catch {
    return;
  }
};

/**
 * The URI of the schema an instance is validated against: the last pattern
 * in the `schemas` setting that matches its path, or else its own top-level
 * `$schema`. Input from stdin can only use `$schema`, unless it's given a
 * path. A schema from `$schema` has its position, for reporting a schema
 * that can't be used.
 *
 * @type (tree: JsonDocumentNode, file: VFile, associations: [string, string][]) => { uri: string; place?: Position } | undefined
 */
const instanceSchemaUri = (tree, file, associations) => {
  if (file.path !== undefined) {
    const path = relative(file.cwd, resolve(file.cwd, file.path));
    const association = associations.findLast(([pattern]) => matchesGlob(path, pattern));
    if (association) {
      return { uri: new URL(association[1], pathToFileURL(`${file.cwd}/`)).href };
    }
  }

  return schemaProperty(tree, file);
};

/**
 * Whether a file is a schema, which is linted, or an instance, which is
 * validated. A `.schema.json` file is a schema, and so is a file whose
 * `$schema` is a dialect.
 *
 * @type (tree: JsonDocumentNode, file: VFile, allowed: string[], fileSet: FileSet | undefined) => Promise<boolean>
 */
const isSchemaFile = async (tree, file, allowed, fileSet) => {
  if (file.path !== undefined && isSchemaFileName(file.path)) {
    return true;
  }

  const dialect = schemaProperty(tree, file);
  return dialect !== undefined && isDialectFor(fileSet, dialect.uri, allowed);
};

/**
 * Validates an instance against the schema the `schemas` setting or its
 * `$schema` says, compiled with the same registry and `allowRetrieval` as a
 * schema in its folder would be resolved with. A JSON file without a schema
 * only has its syntax checked, by the parser.
 *
 * @type (this: Processor, tree: JsonDocumentNode, file: VFile, allowed: string[], settings: { schemas?: unknown }) => Promise<void>
 */
async function validateInstance(tree, file, allowed, settings) {
  let associations;
  try {
    associations = schemaAssociations(settings.schemas);
  } catch (error) {
    return file.fail(/** @type Error */ (error).message, { ruleId: "invalid-setting", source: "hyperjump" });
  }

  const schema = instanceSchemaUri(tree, file, associations);
  if (schema === undefined) {
    return;
  }

  let validator;
  try {
    validator = await validatorFor(fileSets.get(this), schema.uri, allowed);
  } catch (error) {
    // The cause of a `RetrievalError` for an invalid schema is the problem
    const cause = /** @type Error */ (error);
    const reason = cause.cause instanceof Error ? `${cause.message}: ${cause.cause.message}` : cause.message;
    return file.fail(`Unable to use the schema '${schema.uri}'. ${reason}`, {
      place: schema.place,
      ruleId: "invalid-schema",
      source: "hyperjump"
    });
  }

  return /** @type Function */ (jsonSchemaValidate).call(this, { validator })(tree, file);
}

/**
 * Resolves a schema, which finds every problem with it, or validates an
 * instance (see `isSchemaFile`).
 *
 * Each schema is resolved in its own session, with a registry of every
 * schema in the working directory and every schema the CLI was given, so
 * references and meta-schemas find them by their identifiers or paths. What can be retrieved is files in the working directory and the
 * URLs the `allowRetrieval` setting allows. Instances are validated with the
 * same registry and what their folder's settings allow.
 *
 * Input from stdin has no path. It's resolved as if it were in the working
 * directory, so relative identifiers and references resolve against it.
 *
 * @this {Processor}
 * @returns {Transformer<JsonDocumentNode, JsonSchemaDocumentNode>}
 */
function jsonSchemaCli() {
  const processor = this;

  /** @type (tree: JsonDocumentNode, file: VFile) => Promise<JsonSchemaDocumentNode | undefined> */
  const transform = async (tree, file) => {
    const settings = /** @type {{ allowRetrieval?: unknown; schemas?: unknown }} */ (processor.data("settings") ?? {});
    let allowed;
    try {
      allowed = allowedUrls(settings.allowRetrieval);
    } catch (error) {
      return file.fail(/** @type Error */ (error).message, { ruleId: "invalid-setting", source: "hyperjump" });
    }

    const fileSet = fileSets.get(processor);
    if (!await isSchemaFile(tree, file, allowed, fileSet)) {
      await validateInstance.call(processor, tree, file, allowed, settings);
      return;
    }

    const session = await sessionFor(fileSet, allowed);
    const uri = file.path === undefined ? pathToFileURL(`${file.cwd}/`).href : undefined;
    return /** @type Function */ (jsonSchemaResolve).call(processor, { session, uri })(tree, file);
  };

  return (tree, file) => {
    // Without the engine, errors are fatal as they're made
    if (fileSets.has(processor)) {
      holdFatal(file);
    }

    return transform(tree, file);
  };
}

/**
 * Lints schemas and validates instances. Syntax errors are reported without
 * failing the file, so the rest of it is still checked.
 */
export const hyperjump = unified()
  .use(rejsonParse, { accept: "recovered" })
  .use(jsonSchemaCli)
  .use(rejsonStringify)
  .freeze();
