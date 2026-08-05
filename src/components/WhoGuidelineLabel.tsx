type Props = {
  viewBox?: {
    x?: number;
    y?: number;
  };
  fill?: string;
};

/** Green WHO guideline caption, left-aligned just below the dashed line. */
export function WhoGuidelineLabel({ viewBox, fill }: Props) {
  if (viewBox?.x == null || viewBox?.y == null || fill == null) return null;

  return (
    <text
      x={viewBox.x + 8}
      y={viewBox.y + 20}
      fill={fill}
      fontFamily="IBM Plex Mono, monospace"
      fontSize={16}
      fontWeight={700}
    >
      Egészségügyi határérték
    </text>
  );
}
