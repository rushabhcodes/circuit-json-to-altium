import { expect, test } from "bun:test"
import { serializeAltiumPcbToSvg } from "altiumts"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { extractArchive } from "./fixtures"
import { createSideBySideSvg } from "./fixtures/create-side-by-side-svg"

test("preserves SimpleFOC Shield rectangular copper around a circular drill", async () => {
  // P4.1 dimensions from the production altium-to-circuit-json import of
  // references/simplefoc-shield-v3.PcbDoc (provenance in references/README.md).
  // Recenter the pad to isolate its copper and drill dimensions.
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "shield_p4_pin1",
      shape: "circular_hole_with_rect_pad",
      hole_shape: "circle",
      pad_shape: "rect",
      rect_pad_width: 1.7999964,
      rect_pad_height: 1.7999964,
      rect_ccw_rotation: 0,
      hole_diameter: 1.1999976,
      hole_offset_x: 0,
      hole_offset_y: 0,
      x: 0,
      y: 0,
      layers: ["top", "bottom"],
    },
  ]
  const { pcb } = await extractArchive(elements)
  const pads = pcb.getRecordsByKind("Pad")
  expect(pads).toHaveLength(1)
  const pad = pads[0]!
  expect(pad.getAltiumMeasurement("XSIZE")?.toMillimeters()).toBeCloseTo(1.8, 4)
  expect(pad.getAltiumMeasurement("YSIZE")?.toMillimeters()).toBeCloseTo(1.8, 4)
  expect(pad.getAltiumMeasurement("HOLESIZE")?.toMillimeters()).toBeCloseTo(
    1.2,
    4,
  )
  expect(pad.get("SHAPE")).toBe("RECTANGLE")

  const circuitJsonSvg = await convertCircuitJsonToPcbSvg(elements, {
    width: 600,
    height: 600,
    viewport: { minX: -2, minY: -2, maxX: 2, maxY: 2 },
  })
  // Altium's renderer uses mils; both crops show the same 4 × 4 mm area.
  const nativeX = pad.getAltiumMeasurement("X")?.toMils()
  const nativeY = pad.getAltiumMeasurement("Y")?.toMils()
  if (nativeX === undefined || nativeY === undefined)
    throw new Error("Missing native pad position")
  const altiumSvg = serializeAltiumPcbToSvg(pcb, {
    width: 600,
    height: 600,
    showBoardOutline: false,
    viewBox: {
      x: nativeX - 2 / 0.0254,
      y: nativeY - 2 / 0.0254,
      width: 4 / 0.0254,
      height: 4 / 0.0254,
    },
  })
  expect(altiumSvg).toContain('data-record="Pad"')
  await expect(
    createSideBySideSvg(circuitJsonSvg, altiumSvg, {
      source: "Circuit JSON: Shield P4.1, 1.8 mm copper / 1.2 mm drill",
      converted: "Generated Altium: 1.8 mm copper / 1.2 mm drill",
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
