# What can be retrieved (`allowRetrieval`)

Schemas aren't trusted. A schema shouldn't be able to make an application
retrieve whatever it names, such as an internal address over HTTP or a file
outside the project through a `file:` reference. So only what the
application allows is retrieved, and the default allows only what's local
to it.

It's browser's (`HyperjumpConfig.allowRetrieval`), because it's about
retrieval and browser does the retrieving, and JRef documents aren't
trusted either. `JsonSchemaConfig` gets it from `HyperjumpConfig`, and
`RetrievalNotAllowedError` is browser's, re-exported. It was in this package
first, where it had to copy browser's context URI, run its own `realpath`
next to the file plugin's, pass what a session allows to `retrieve`
disguised as a `GetOptions` field, and unwrap the error from browser's
`RetrievalError`.

- The `allowRetrieval` config is a list of URLs, `string[]`. One that ends
  with `/` allows everything under it. Any other allows only itself. They're
  compared after the URL is parsed, so dot segments and the host can't get
  around it. An entry's fragment is ignored.
- A relative entry is resolved against browser's context URI, like a
  relative path is. That's the working directory in Node.js and the page in
  a browser. Entries are resolved when the config or the session's options
  are given, and one that isn't a URL throws there. A relative entry where
  there's no context URI, such as in a worker, throws and says to use an
  absolute URL, instead of quietly allowing nothing. The default is resolved
  when a session first checks a URL, so an application without a context
  URI that only uses registries doesn't need the config.
- The context URI is browser's `#context-uri`. Without a page, it's `""`,
  which counts as none.
- browser's default is `["./"]` too. It's a hypermedia client, and
  following links across origins is what it's for, so an application that
  browses a remote API lists its origins. Allowing everything in browser,
  with `JsonSchema` passing its own default, was considered, but the threat
  is the same, and browser's users would only be safe if they opted in.
- The default is `["./"]` everywhere: the working directory in Node.js, and
  the page's directory in a browser. Browsers can't read `file:` URLs
  anyway.
  - It's data, so an application extends it by writing it out, such as
    `["./", "https://schemas.example.com/"]`, and `[]` allows nothing.
    It's the same in Node.js and in browsers.
  - It used to be a predicate, `(url: URL) => boolean | Promise<boolean>`,
    with a default for each runtime: files in the working directory's real
    path in Node.js, and the page's origin in a browser. Allowing a URL as
    well as the default meant calling the default, so it would have had to
    be exported, and a predicate written without it had to know to compare
    against `realpath(cwd())`, not `cwd()`, or a working directory reached
    through a symlink refused every file. The CLI had its own prefix
    matching for its setting too. A list has none of these problems.
  - In a browser, the default used to be the page's whole origin. It's the
    page's directory now, which is narrower. An application whose schemas
    are elsewhere on its origin adds `"/"`. A default of `["/"]` in
    browsers would have kept the origin, but then the default would be
    different in Node.js, where `/` is the whole filesystem.
- A `file:` entry is compared by its real path, like the URL being checked
  (see the symlink item below). It's found the first time a session checks
  against it and kept for the session, which is a consistent snapshot
  anyway. An entry that doesn't exist is compared as it is.
- A file that doesn't exist has no real path, so its path is checked as
  it is. If it's allowed, retrieving it fails as missing instead of being
  refused.
- Only prefixes and exact URLs, no globs. Prefixes cover origins,
  directories, and single URLs. Glob syntax would collide with URLs, where
  `?`, `*`, `[`, and `:` already mean something, so every entry would be a
  pattern and a literal one would need escaping, and a glob matched against
  the whole URL text lets `https://*.example.com/` match
  `https://evil.com/x.example.com/`. If wildcards are needed, such as any
  subdomain, entries could also be `URLPattern`s (`(string | URLPattern)[]`).
  It's the web standard, matches each part of a URL separately, and takes a
  base URL for relative patterns. Strings would stay literal. Check which
  Node.js versions have it unflagged first.
- A predicate as well as the list, for anything a list can't say, was
  considered and left out until someone needs it. Whoever used it would
  have the problem the list solves.
- browser's `Session` checks it when it retrieves a document that isn't in
  its cache, before it calls `Hyperjump.retrieve`. That's after embedded
  resources and registries, because `JsonSchemaSession.getDocument` finds
  those first. So it covers `get`, following references, `compile`, and
  meta-schemas found by `getDialect`. It's before the URI scheme plugins, so
  it's before the HTTP cache too, and a cached response isn't a way around
  it. `Hyperjump.retrieve` itself isn't checked. It's for URI scheme plugins
  that map to another URI, like `urn:`, and the response they give is
  checked by its URL.
- browser throws a `RetrievalNotAllowedError` as it is, not wrapped in a
  `RetrievalError`, so it's what `get` and `compile` throw. A refusal while
  getting a dialect's meta-schema is the `cause` of `getDialect`'s error.
- A URL `allowRetrieval` refuses is a `RetrievalNotAllowedError`, distinct from
  a `RetrievalError` for a URL that was allowed and couldn't be retrieved.
  Tools use the difference: a refused URL is unknown, a failed one is
  missing.
- It's config, because it's a property of the application, like its URI
  scheme plugins, and every session should follow it by default. A session
  can have its own (`SessionOptions.allowRetrieval`), which replaces the
  config's rather than adding to it, for an application that allows
  different things for different sessions, like the CLI does for files with
  different settings. A session can allow less than the config, so it
  can't only add to it. One that allows more lists the config's entries
  too. The application creates its sessions, so it's still the
  application's decision. `JsonSchemaSession` passes its option to
  browser's `Session` constructor.
- Symlinks are handled by the library. A symlink inside an allowed
  directory can point outside it. In Node.js, a `file:` URL is replaced
  with its real path (`realpath`) before it's checked, and so are `file:`
  entries. browser's file plugin reads the file from its real path, with
  every symlink in the path resolved, and gives that real path as the
  response's URL, which is checked again (see the next item). So what's
  checked is what's read, even if the path changes between the first check
  and the read. There's no cheaper way to tell whether a path goes through
  a symlink than `realpath`, so every `file:` retrieval costs two
  filesystem calls, the check's and the plugin's.
- A document read through a symlink is identified by its real path, so its
  relative references resolve from where the file really is, next to the
  files its author wrote it with. That's browser's choice, and it's how
  Node.js resolves modules. Keeping the URL it was asked for was
  considered, but the author of a symlinked file didn't write it relative
  to the link.
- Redirects are checked after the fact. The URL a response came from is
  also checked, after any redirects, and a response from a
  refused URL is a `RetrievalNotAllowedError` whose `uri` is that URL. Its
  body is cancelled. browser's file plugin also gives a symlinked file's
  real path as its response URL, which is checked the same way. browser doesn't follow
  redirects manually, so the redirected request is still sent. Only its
  response can't be used, which is what CORS does in browsers (see [Known limitations](#known-limitations)).
- `[]` allows nothing, so only registries and embedded resources are used.
  The test suite runners and the tests that only use registries use it
  instead of removing the `http(s):` URI scheme plugins. Tests that read
  files from a temporary directory, outside the working directory, allow
  that directory.

## Known limitations

- `allowRetrieval` can't stop a request that a redirect leads to. It's
  checked on the URL that was asked for and the URL the response came from,
  so a response from a refused URL is never used, but the redirected
  request has already been sent. That's the same protection CORS gives in
  browsers. In Node.js, a request whose sending is the harm, such as a GET
  to an internal endpoint with side effects, isn't prevented. Two stronger
  options: browser's `http(s):` plugin could refuse redirects
  (`redirect: "error"`), which breaks servers that redirect, or a `fetch`
  dispatcher could check the address it connects to, which also stops DNS
  rebinding but needs undici.
- Someone who can change the filesystem could swap a part of a path for a
  symlink between browser's `realpath` and its read. The response's URL is
  checked, but it's the path the plugin resolved, not necessarily what it
  opened. The file is also opened before that second check, though nothing
  is read from it if it's refused. Opening a FIFO or a device can have an
  effect. Schemas are what's untrusted, not the filesystem, so that's out
  of scope.
