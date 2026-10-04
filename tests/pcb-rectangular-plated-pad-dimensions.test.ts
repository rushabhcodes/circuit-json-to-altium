import { expect, test } from "bun:test"
import { board, type CircuitElement, extractArchive } from "./fixtures"

test("preserves rectangular copper dimensions on plated holes", async () => {
  const shapes = [
    "pill_hole_with_rect_pad",
    "rotated_pill_hole_with_rect_pad",
    "circular_hole_with_rect_pad",
  ]
  const elements: CircuitElement[] = [
    board(),
    ...shapes.map((shape, index) => ({
      type: "pcb_plated_hole",
      pcb_plated_hole_id: `pth${index}`,
      shape,
      x: index * 6,
      y: 0,
      layers: ["top", "bottom"],
      rect_pad_width: 4.826,
      rect_pad_height: 1.905,
      ...(shape === "circular_hole_with_rect_pad"
        ? { hole_diameter: 1.27 }
        : { hole_width: 4.191, hole_height: 1.27 }),
    })),
  ]
  const { pcb } = await extractArchive(elements)
  const pads = pcb.getRecordsByKind("Pad")
  expect(pads).toHaveLength(shapes.length)
  for (const [index, pad] of pads.entries()) {
    expect(pad.getAltiumMeasurement("XSIZE")?.toMillimeters()).toBeCloseTo(
      4.826,
      4,
    )
    expect(pad.getAltiumMeasurement("YSIZE")?.toMillimeters()).toBeCloseTo(
      1.905,
      4,
    )
    expect(pad.getAltiumMeasurement("HOLESIZE")?.toMillimeters()).toBeCloseTo(
      1.27,
      4,
    )
    if (index < 2) expect(pad.get("HOLESHAPE")).toBe("SLOT")
  }
})
