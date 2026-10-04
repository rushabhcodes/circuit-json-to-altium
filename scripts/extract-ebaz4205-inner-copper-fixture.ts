import { createHash } from "node:crypto"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

// Pass the sibling production importer's lib/index.ts to avoid coupling the
// exporter's dependencies to a local checkout or a moving published version.
const importerPath = Bun.argv[2]
if (!importerPath) {
  throw new Error(
    "Usage: bun scripts/extract-ebaz4205-inner-copper-fixture.ts /path/to/altium-to-circuit-json/lib/index.ts",
  )
}
const { convertAltiumToCircuitJson } = await import(
  pathToFileURL(resolve(importerPath)).href
)
const bytes = new Uint8Array(
  await Bun.file(
    new URL("../references/ebaz4205.PcbDoc", import.meta.url),
  ).arrayBuffer(),
)
if (
  createHash("sha256").update(bytes).digest("hex") !==
  "1dbeba2537bdf83e77bc9c5a7a6f2f7bf1104193f3dc2547d020dbd8018b4e62"
) {
  throw new Error("EBAZ4205 reference checksum mismatch")
}
const elements = convertAltiumToCircuitJson(bytes).filter(
  (element: {
    type: string
    route?: { route_type: string; layer?: string }[]
  }) =>
    element.type === "pcb_board" ||
    (element.type === "pcb_trace" &&
      element.route?.some(
        (point) =>
          point.route_type === "wire" && point.layer?.startsWith("inner"),
      )),
)
await Bun.write(
  new URL(
    "../tests/assets/ebaz4205-copper-tracks.circuit.json",
    import.meta.url,
  ),
  `${JSON.stringify(elements, null, 2)}\n`,
)
