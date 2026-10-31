import { fileURLToPath } from "node:url";
import { build } from "vite";

import type { Rolldown } from "vite";

// The repo, so the entries' imports resolve to this package
const root = fileURLToPath(new URL("../..", import.meta.url));

/** An entry bundled on its own with Vite (library mode, minified, for browsers) */
export const bundle = async (entry: string): Promise<Rolldown.OutputChunk[]> => {
  const result = await build({
    root,
    logLevel: "error",
    configFile: false,
    build: {
      write: false,
      minify: true,
      target: "es2022",
      lib: { entry, formats: ["es"], fileName: "bundle" }
    }
  }) as Rolldown.RolldownOutput | Rolldown.RolldownOutput[];
  const { output } = Array.isArray(result) ? result[0] : result;
  return output.filter((file): file is Rolldown.OutputChunk => file.type === "chunk");
};

/** The entry chunk and the chunks it imports statically */
export const upFront = (chunks: Rolldown.OutputChunk[]) => {
  const byName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
  const loaded = new Set<Rolldown.OutputChunk>();
  const visit = (chunk: Rolldown.OutputChunk) => {
    if (!loaded.has(chunk)) {
      loaded.add(chunk);
      chunk.imports.forEach((fileName) => visit(byName.get(fileName)!));
    }
  };
  visit(chunks.find((chunk) => chunk.isEntry)!);
  return [...loaded];
};
