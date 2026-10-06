import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { extractArchive } from "./fixtures"

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
})
