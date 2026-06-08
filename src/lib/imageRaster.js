export function applyImageMode(red, green, blue, mode) {
  if (mode === 'grayscale') {
    const luminance = Math.round(red * 0.299 + green * 0.587 + blue * 0.114)
    return [luminance, luminance, luminance]
  }
  if (mode === 'quantized') {
    const quantize = (value) => Math.min(255, Math.round(value / 64) * 64)
    return [quantize(red), quantize(green), quantize(blue)]
  }
  return [red, green, blue]
}
