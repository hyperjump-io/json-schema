import { browse } from "@hyperjump/browser";
import { toAbsoluteIri } from "@hyperjump/uri";

/**
 * @import { Hyperjump, JsonErrorNode, Target } from "@hyperjump/browser"
 * @import { NormalizedIri } from "@hyperjump/uri"
 * @import { JsonSchemaConfig } from "./json-schema.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaTolerantNode } from "./schema/schema-ast.d.ts"
 */

/**
 * What an operation that follows references one at a time uses to retrieve
 * them all at once. `from(document)` starts retrieving the documents its
 * references find, and the ones theirs find, at `low` priority. Following
 * a reference still waits for it, and browser shares a document that's
 * being retrieved, so it gets what was loaded ahead, at the priority of
 * what's waiting.
 *
 * Each document is loaded once. One the document contains isn't loaded,
 * because a reference finds it there. What's loaded ahead might not be
 * used, so a failure is only seen if the reference is followed.
 * `settled()` is when everything that was started is done, so what an
 * operation retrieves doesn't outlive it.
 *
 * `follows` says whether a document is loaded, by its URI.
 *
 * @type (session: Hyperjump<JsonSchemaConfig>, follows?: (uri: NormalizedIri) => boolean) => {
 *   from: (document: JsonSchemaDocumentNode) => void;
 *   settled: () => Promise<void>;
 * }
 */
export const loadAhead = (session, follows = () => true) => {
  /** @type WeakSet<JsonSchemaDocumentNode> */
  const started = new WeakSet();
  /** @type Set<string> */
  const loading = new Set();
  /** @type Promise<unknown>[] */
  const pending = [];

  /** @type (document: JsonSchemaDocumentNode) => void */
  const from = (document) => {
    if (started.has(document)) {
      return;
    }
    started.add(document);

    for (const href of referencesIn(document.children[0])) {
      const uri = /** @type NormalizedIri */ (toAbsoluteIri(href));
      if (loading.has(uri) || uri in document.embedded || !follows(uri)) {
        continue;
      }
      loading.add(uri);

      // Each one adds what it loads ahead before it settles
      pending.push(browse(session, uri, { referencedFrom: document, reference: "manual", priority: "low" })
        .then((target) => from(/** @type Target<JsonSchemaDocumentNode> */ (target).document)));
    }
  };

  const settled = async () => {
    for (let batch = pending.splice(0); batch.length > 0; batch = pending.splice(0)) {
      await Promise.allSettled(batch);
    }
  };

  return { from, settled };
};

/**
 * Where each reference under a node refers to, read from the nodes, which
 * is quicker than browsing them, and nothing is followed
 *
 * @type (node: JsonSchemaTolerantNode | JsonErrorNode | undefined) => Generator<NormalizedIri>
 */
function* referencesIn(node) {
  if (node === undefined || node.type === "json-invalid" || node.type === "json-missing") {
    return;
  }
  if (node.type === "reference") {
    yield node.href;
  } else if (node.jsonType === "array") {
    for (const item of node.children) {
      yield* referencesIn(item);
    }
  } else if (node.jsonType === "object") {
    for (const property of node.children) {
      yield* referencesIn(property.children[1]);
    }
  }
}
