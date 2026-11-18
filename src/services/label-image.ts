import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const LONG_EDGE = 1568; // Claude's recommended max before it downsamples itself

/** Always re-encode to JPEG (HEIC/PNG/huge photos in, bare base64 JPEG out; interaction spec E16). */
export async function prepareLabelImage(uri: string, width = 0, height = 0): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > LONG_EDGE) ctx.resize(width >= height ? { width: LONG_EDGE } : { height: LONG_EDGE });
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!saved.base64) throw new Error('Image could not be encoded');
  return saved.base64;
}
