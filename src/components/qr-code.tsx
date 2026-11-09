import { encode } from "uqr";

interface QrCodeProps {
  value: string;
  label: string;
}

/** QR code drawn as SVG rectangles (no HTML injection). */
export function QrCode({ value, label }: QrCodeProps) {
  const { data, size } = encode(value, { ecc: "M", border: 2 });
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      width={224}
      height={224}
      shapeRendering="crispEdges"
      className="rounded bg-white"
    >
      {data.flatMap((row, y) =>
        row.map((dark, x) => (dark ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#000" /> : null)),
      )}
    </svg>
  );
}
