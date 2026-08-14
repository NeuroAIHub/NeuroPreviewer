# DeepSeek Harness ecosystem publishing

Verified 2026-08-14 using only the official DeepSeek Harness repository and
official npm registry metadata. Repository citations are pinned to commit
[`47f943859bef60e4160492346772ded9b24f765a`](https://github.com/deepseek-ai/deepseek-harness/commit/47f943859bef60e4160492346772ded9b24f765a),
the `master` head inspected for this note.

## Bottom line

A distributable Harness plugin is normally an npm-compatible **bundle**: its
`package.json` declares `dsh.bundle.patch`, and that patch mounts the package's
plugins. Users install the package or git spec into a named **profile** with
`dsh plugin --profile <name> add ...`; the CLI delegates package management to
pnpm and maintains the profile's ordered bundle list. A package that also has a
browser half declares `dsh.client` and exports a built `./client` bundle. These
are complementary package facets: `dsh.bundle` activates configuration, while
`dsh.client` lets the Web client-module service discover an already-mounted
package's browser code.
([publishing tutorial](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.md#two-concepts-two-manifests),
[`dsh.client` scan contract](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/client-modules.md#the-scan))

The first-party discovery path is currently the GitHub
[`dsh-plugin`](https://github.com/topics/dsh-plugin) topic, backed by GitHub
Discussions and the Harness Discord community. The inspected official sources
do not document a DeepSeek-operated plugin marketplace or curated publishing
registry. npm is a supported distribution registry, and a registry is not
required because git specs and tarballs are also supported.
([project README](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md#community-and-support),
[`CONTRIBUTING.md`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/CONTRIBUTING.md#L9-L21),
[`publish.md`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.md#installing-from-github-the-build-script-catch))

## 1. Package contract: `dsh.bundle`

The minimal public package has a package entry point, a patch file, and this
manifest:

```json
{
  "name": "@neuroaihub/dsh-neuro-previewer",
  "version": "0.1.0",
  "type": "module",
  "main": "lib/index.js",
  "files": ["lib", "cordis.patch.yml"],
  "dsh": {
    "bundle": {
      "patch": "./cordis.patch.yml"
    }
  }
}
```

The patch is a YAML patch list. Its plugin `name` values should be resolvable
package names or exported subpaths, not source-checkout-relative paths:

```yaml
- insert:
    - id: neuro-previewer
      name: '@neuroaihub/dsh-neuro-previewer'
```

The official tutorial uses this same structure and explicitly includes both
the code and patch in the published `files`. A package without `dsh.bundle`
can still be installed, but it remains only a dependency and contributes no
profile layer. At boot, a package explicitly listed as a bundle but lacking
the declaration fails loudly.
([tutorial manifest and patch](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.md#the-bundle-manifest),
[`loadProfile` source](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/boot/app-boot/src/profile.ts#L357-L402))

The bundle patch is applied in profile-list order. Then Harness applies the
profile's `cordis.patch.yml`, the home-level `$DSH_HOME/cordis.patch.yml`, and
command-line `--patch` overlays. Later layers win per row, and replacing a
row's `config` replaces the whole value rather than deep-merging it. Bundle
authors should therefore provide conservative defaults and expect profile
owners to override them.
([loading order](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.md#the-loading-order))

## 2. Browser contract: `dsh.client`

Use `dsh.client` only when the package contributes browser code to the Web
surface. The package must expose a built client artifact through
`exports["./client"]` and declare the Web platform:

```json
{
  "exports": {
    ".": "./lib/index.js",
    "./client": {
      "types": "./lib/types/client/index.d.ts",
      "default": "./lib/client.js"
    }
  },
  "dsh": {
    "client": {
      "platform": "web",
      "inject": ["@deepseek-ai/dsh-client-runtime"],
      "immediately": false
    }
  },
  "files": ["lib/index.js", "lib/client.js", "lib/types/**/*.d.ts"]
}
```

`platform` is required by the parser; only `web` packages join the current Web
table. `inject` is an optional string array of package-name dependency edges,
and `immediately` is an optional boolean that requests first-stage prefetch;
absence means lazy fetch on first import. `exports["./client"]` may be a string
or a one-level conditional object with a string `default`. A malformed
declaration, a missing export, or a missing built client file makes initial Web
composition fail loudly.
([declaration parser](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/client/modules/src/index.ts#L46-L142),
[discovery and built-file checks](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/client/modules/src/index.ts#L332-L400))

The Web scanner does not activate packages merely because they declare
`dsh.client`: it scans enabled Loader entries. Consequently, a distributable UI
package still needs to be mounted by a bundle patch (or another profile layer).
The package root is its Host half; the `./client` export is its browser half.
The official message-feedback package is a concrete manifest example.
([scan behavior](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/client-modules.md#the-scan),
[official dual-face package manifest](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/client/ui-message-feedback/package.json#L13-L60))

## 3. npm names and package identity

There is no documented or source-enforced third-party npm prefix. Official
packages use the DeepSeek-owned `@deepseek-ai/dsh-*` scope, while the official
publishing tutorial deliberately uses the unscoped example
`dsh-hello-plugin`; the documented external surface example installs the
unscoped `turtle-ui`. A third party should publish under a name or npm scope it
controls and use that exact name in the bundle patch and install command.
([tutorial naming example](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.md#the-bundle-manifest),
[external install example](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/apps/cli/reference/README.md#plugin-management))

Package identity is functional, not cosmetic. The profile stores package names
in `dsh.profile.bundles`; patch rows resolve bare package names with normal Node
resolution; and the Web boot graph uses the client package name as its entry
id. Scoped names are supported—the bundle route explicitly allows the scope
slash.
([profile resolution](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/apps/cli/reference/README.md#profile-boot),
[client graph identity](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/client-modules.md#the-wire))

Do not publish third-party packages under `@deepseek-ai`; that string denotes
the official organization's npm scope in the inspected metadata. This is a
namespace-ownership recommendation, not a Harness loader restriction.

## 4. Install, inspect, update, and remove

For an npm release:

```sh
dsh plugin --profile neuro add @neuroaihub/dsh-neuro-previewer@0.1.0
dsh --profile neuro --dump-config
dsh --profile neuro
```

For a local checkout:

```sh
dsh plugin --profile neuro add .
```

For a git release pinned to an immutable commit:

```sh
dsh plugin --profile neuro add github:OWNER/REPO#COMMIT_SHA
```

To update or remove:

```sh
dsh plugin --profile neuro update @neuroaihub/dsh-neuro-previewer
dsh plugin --profile neuro remove @neuroaihub/dsh-neuro-previewer
```

`dsh plugin` initializes a missing custom profile with
`@deepseek-ai/dsh-base`, forwards the requested verb to pnpm inside the profile
directory, and reconciles `dsh.profile.bundles` after every successful run. An
update can therefore activate a dependency whose new version has acquired a
`dsh.bundle` declaration. Relative specs are anchored to the caller's original
directory before pnpm runs in the profile.
([CLI plugin-management reference](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/apps/cli/reference/README.md#plugin-management))

## 5. GitHub installs and the `prepare` caveat

A git dependency supplies source, not registry-built output. pnpm does not run
an ordinary `build` script for it. A TypeScript plugin intended for git install
must therefore provide a self-contained `prepare` script that creates every
published Host and client entry point without depending on a sibling monorepo
checkout or other development-only context.

With pnpm 10 or newer, the consumer must also allow that install-time build.
The first add is expected to fail and print the package key; the user copies
that exact key into the profile's `pnpm-workspace.yaml`, then retries:

```yaml
allowBuilds:
  '@neuroaihub/dsh-neuro-previewer': true
```

This is permission to execute dependency code on the user's machine outside
the agent sandbox. The official guidance is to allow only trusted sources and
pin the git dependency to a commit SHA. Publishing already-built `lib/`
artifacts to npm, or distributing a built `pnpm pack` tarball, avoids this
install-time permission.
([official Git install guidance](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.md#installing-from-github-the-build-script-catch))

## 6. Version compatibility and release policy

Harness is explicitly a developer preview and promises compatibility-breaking
changes. There is no `dsh.bundle` or `dsh.client` field for a compatible
Harness version, and the inspected loader code performs no Harness-version
negotiation. Compatibility must therefore be expressed through ordinary npm
dependencies or peer dependencies and verified by testing.
([preview warning](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md#developer-preview),
[bundle manifest type](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/boot/app-boot/src/profile.ts#L41-L70),
[client manifest parser](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/client/modules/src/index.ts#L46-L129))

As of the verification date, official npm metadata reports
`@deepseek-ai/dsh@0.1.0-rc.6` as both `latest` and `next`. That published CLI
depends on its in-box `@deepseek-ai/dsh-*` family with ranges beginning at the
same `0.1.0-rc.6` release. The published official UI package likewise declares
its Harness imports as peer dependencies beginning at `0.1.0-rc.6`.
([`@deepseek-ai/dsh` registry metadata](https://registry.npmjs.org/@deepseek-ai%2fdsh),
[version-pinned UI metadata](https://registry.npmjs.org/@deepseek-ai%2fdsh-client-ui-message-feedback/0.1.0-rc.6))

Practical policy for an out-of-tree package during the preview:

- declare every imported Harness package as a peer dependency (and as a dev
  dependency for local builds), following official dual-face packages;
- test and document the exact CLI release(s) supported;
- keep the compatibility range narrow until a newer release has passed the
  package's Host and Web smoke tests;
- pin the plugin version or git SHA in reproducible profiles.

Those bullets are conservative publishing guidance inferred from the preview
warning and the official packages' peer-dependency pattern, not a first-party
compatibility guarantee.

## 7. Distribution and community path

1. Build and pack locally; confirm the tarball contains the declared patch,
   Host entry points, and `./client` output when applicable.
2. Install that tarball into a fresh profile and inspect `--dump-config` before
   booting.
3. Publish the built package to npm, or publish a git tag/commit with a safe,
   self-contained `prepare` path.
4. Add the `dsh-plugin` topic to the public repository. Use Harness GitHub
   Discussions for feedback and the linked Discord for community contact.

This is the whole documented path today. The npm package page/registry is the
distribution index; the GitHub topic is the explicit ecosystem discovery
mechanism. No official source inspected here specifies a marketplace
submission, review, signing, ranking, or compatibility-certification process.

## 8. Audit of this repository

The current [`package.json`](../package.json) already has the essential DSH
shape:

- `@neuroaihub/dsh-neuro-previewer` is a sensible third-party scoped name and is
  used verbatim by the root Loader row in [`cordis.patch.yml`](../cordis.patch.yml).
- `dsh.bundle.patch` names the shipped patch, while `dsh.client.platform` is
  `web` and `exports["./client"]` points at `lib/client.js`.
- `files` includes `lib/**` and the patch. `prepack` runs the checks and build,
  so npm and packed-tarball releases can contain prebuilt artifacts.
- Harness imports are exact `0.1.0-rc.6` peers, which is appropriately
  conservative for the current developer preview. Re-test and release a new
  plugin version before widening those ranges.

Four publication items remain:

1. npm/GitHub provenance fields (`repository`, `homepage`, and `bugs`) now
   point to the public NeuroAIHub repository. The package is not present in
   the official npm registry as of 2026-08-14 (the package metadata endpoint
   returns `404`).
2. Decide whether GitHub source installation is supported. `lib/` is not
   tracked by Git and there is no `prepare` script, so the documented
   `github:OWNER/REPO#SHA` route will not build this checkout. Either add a
   self-contained `prepare`, with the user's pnpm `allowBuilds` step, or state
   that only npm/tarball installs are supported.
3. `engines.node` now uses the compatibility floor DSH documents:
   `^22.19.0 || >=24.0.0`. The published CLI currently omits an `engines`
   field, so this comes from the repository's development prerequisites, not
   npm enforcement.
4. On publication, add the GitHub `dsh-plugin` topic and document a pinned
   install command such as:

   ```sh
   dsh plugin --profile web add @neuroaihub/dsh-neuro-previewer@0.1.0-alpha.1
   dsh --profile web --dump-config
   ```

([Git build requirement](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.md#L153-L178),
[documented Node floor](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/development.md#L7-L13),
[`@neuroaihub/dsh-neuro-previewer` npm metadata endpoint](https://registry.npmjs.org/@neuroaihub%2fdsh-neuro-previewer))

## Ambiguities and limits of the official sources

- **Repository source and npm release do not show the same version.** The
  inspected repository commit contains `0.1.0-rc.5` package manifests, while
  npm's official metadata reports `0.1.0-rc.6` as current. Use registry
  metadata for released versions and the pinned repository commit for source
  behavior; do not infer the current npm version from a moving checkout.
  ([source CLI manifest](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/apps/cli/package.json#L1-L13),
  [`rc.6` npm metadata](https://registry.npmjs.org/@deepseek-ai%2fdsh/0.1.0-rc.6))
- **No formal third-party compatibility matrix exists in the inspected
  sources.** Peer ranges show package-manager compatibility claims, not proof
  that a plugin has been tested across every satisfying release.
- **The conceptual and permissive type contracts differ slightly.** The
  publishing tutorial says a package is either a bundle or a profile and
  "nothing is both," while the source type comment says a `dsh` manifest may
  declare both roles. Publishers should follow the tutorial: distribute a
  bundle package and let `dsh plugin` own the profile manifest.
  ([tutorial](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.md#L9-L16),
  [source type](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/boot/app-boot/src/profile.ts#L53-L62))
- **`dsh.client.platform` is typed as any string but only `web` is consumed.**
  No other client platform or extension-discovery contract is documented in
  the inspected sources.
- **No official marketplace is documented.** Absence from these sources is not
  proof that no experimental or future catalog exists; it means publishers
  should currently plan around npm/git distribution and `dsh-plugin` topic
  discovery.

## Exact primary-source URLs

- <https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.md>
- <https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/apps/cli/reference/README.md>
- <https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/boot/app-boot/src/profile.ts>
- <https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/client-modules.md>
- <https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/client/modules/src/index.ts>
- <https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/client/ui-message-feedback/package.json>
- <https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md>
- <https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/CONTRIBUTING.md>
- <https://registry.npmjs.org/@deepseek-ai%2fdsh>
- <https://registry.npmjs.org/@deepseek-ai%2fdsh/0.1.0-rc.6>
- <https://registry.npmjs.org/@deepseek-ai%2fdsh-base/0.1.0-rc.6>
- <https://registry.npmjs.org/@deepseek-ai%2fdsh-client-modules/0.1.0-rc.6>
- <https://registry.npmjs.org/@deepseek-ai%2fdsh-client-ui-message-feedback/0.1.0-rc.6>
