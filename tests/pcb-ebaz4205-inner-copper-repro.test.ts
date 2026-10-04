import { expect, test } from "bun:test"
import { createHash } from "node:crypto"
import {
  AltiumBinaryPcbDoc,
  AltiumPcbDoc,
  AltiumTrackRecord,
  parseAltiumBinaryPcbDoc,
  parseAltiumFile,
  serializeAltiumPcbToSvg,
} from "altiumts"
import { CircuitJsonToAltiumConverter } from "../lib"
import type { CircuitElement } from "./fixtures"
import { createSideBySideSvg } from "./fixtures/create-side-by-side-svg"

test("preserves the real EBAZ4205 inner2 tracks instead of moving them to top copper", async () => {
  const sourceBytes = new Uint8Array(
    await Bun.file(
      new URL("../references/ebaz4205.PcbDoc", import.meta.url),
    ).arrayBuffer(),
  )
  expect(createHash("sha256").update(sourceBytes).digest("hex")).toBe(
    "1dbeba2537bdf83e77bc9c5a7a6f2f7bf1104193f3dc2547d020dbd8018b4e62",
  )
  const source = parseAltiumFile(sourceBytes).document
  if (
    !(source instanceof AltiumPcbDoc) &&
    !(source instanceof AltiumBinaryPcbDoc)
  ) {
    throw new Error("Expected a PCB reference")
  }
  const sourceTracks = source.records.filter(
    (record): record is AltiumTrackRecord =>
      record instanceof AltiumTrackRecord && record.layer === "MID-LAYER2",
  )
  const elements = (await Bun.file(
    new URL("./assets/ebaz4205-copper-tracks.circuit.json", import.meta.url),
  ).json()) as CircuitElement[]
  expect(sourceTracks).toHaveLength(20)
  expect(
    elements.filter((element) => element.type === "pcb_trace"),
  ).toHaveLength(20)
  const converter = new CircuitJsonToAltiumConverter(elements, {
    projectName: "EBAZ4205 inner copper",
  })
  converter.runUntilFinished()
  const generated = parseAltiumBinaryPcbDoc(converter.getOutput().pcb.content)
  const tracks = generated.records.filter(
    (record): record is AltiumTrackRecord =>
      record instanceof AltiumTrackRecord,
  )
  expect(tracks).toHaveLength(20)
  const board = elements.find((element) => element.type === "pcb_board")!
  const outline = board.outline as { x: number; y: number }[]
  const offsetX = 25.4 - Math.min(...outline.map((point) => point.x))
  const offsetY = 25.4 - Math.min(...outline.map((point) => point.y))
  for (const [index, track] of tracks.entries()) {
    const original = sourceTracks[index]!
    expect(track.widthMils).toBeCloseTo(original.widthMils!, 4)
    for (const endpoint of ["start", "end"] as const) {
      expect(track[endpoint]!.x * 0.0254 - offsetX).toBeCloseTo(
        original[endpoint]!.x * 0.0254,
        4,
      )
      expect(track[endpoint]!.y * 0.0254 - offsetY).toBeCloseTo(
        original[endpoint]!.y * 0.0254,
        4,
      )
    }
  }
  const sourceTrackDocument = new AltiumPcbDoc({
    lines: [source.board!, ...sourceTracks],
  })
  const points = sourceTracks.flatMap((track) => [track.start!, track.end!])
  const minX = Math.min(...points.map((point) => point.x)) - 50
  const minY = Math.min(...points.map((point) => point.y)) - 50
  const crop = {
    x: minX,
    y: minY,
    width: Math.max(...points.map((point) => point.x)) + 50 - minX,
    height: Math.max(...points.map((point) => point.y)) + 50 - minY,
  }
  await expect(
    createSideBySideSvg(
      serializeAltiumPcbToSvg(sourceTrackDocument, {
        viewBox: crop,
        width: 650,
        height: 650,
      }),
      serializeAltiumPcbToSvg(generated, {
        viewBox: {
          ...crop,
          x: crop.x + offsetX / 0.0254,
          y: crop.y + offsetY / 0.0254,
        },
        width: 650,
        height: 650,
      }),
      {
        source: "Original",
        converted: "Exported",
      },
    ),
  ).toMatchSvgSnapshot(import.meta.path)
  expect(tracks.every((track) => track.layer === "MID-LAYER2")).toBe(true)
  expect(generated.board?.layerStack.entries).toHaveLength(4)
})
