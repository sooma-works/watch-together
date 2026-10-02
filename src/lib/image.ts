/**
 * Recorta una foto al cuadrado (centrada) y la achica a `size` px en webp.
 * Una foto de celular pasa de varios MB a ~20 KB, y así sube rápido.
 */
export async function squareAvatar(file: File, size = 320): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Elegí una imagen.')
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('No pudimos leer esa imagen. Probá con otra.')
  }
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85))
  if (!blob) throw new Error('No pudimos procesar la imagen.')
  return blob
}
