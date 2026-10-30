export type ControlOrientation = 'vertical' | 'horizontal' | 'corner-grid';

/**
 * Computes spatial orientation layout based on viewport coordinates.
 *
 * Rules:
 * - Corners (TL, TR, BL, BR): 'corner-grid' (compact 2xN cluster hugging screen corners)
 * - Top / Bottom edges: 'horizontal' (horizontal bar along margins)
 * - Left / Right edges or center: 'vertical' (vertical column along sides)
 */
export function computeControlOrientation(
  x: number,
  y: number,
  viewportWidth = 390,
  viewportHeight = 844
): ControlOrientation {
  const isTop = y < 130;
  const isBottom = y > viewportHeight - 210;
  const isLeft = x < 80;
  const isRight = x > viewportWidth - 120;

  // Corners: half vertical, half horizontal (2xN cluster)
  if ((isTop || isBottom) && (isLeft || isRight)) {
    return 'corner-grid';
  }

  // Top or Bottom edges: horizontal alignment
  if (isTop || isBottom) {
    return 'horizontal';
  }

  // Left or Right edges or general vertical sides
  return 'vertical';
}
