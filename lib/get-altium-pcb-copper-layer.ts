export function getAltiumPcbCopperLayer(layer: string): string {
  const normalized = layer.toLowerCase()
  if (normalized === "top") return "TOP"
  if (normalized === "bottom") return "BOTTOM"
  const innerLayer = /^inner([1-8])$/.exec(normalized)
  if (innerLayer) return `MID-LAYER${innerLayer[1]}`
  throw new Error(`Unsupported PCB copper layer: ${layer}`)
}
