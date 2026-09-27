import { User } from "lucide-react";

export interface EyePrescription {
  ro: number;
  dia: number;
  sphere: number;
  cyl?: number | null;
  axe?: number | null;
}

interface LensComponentCardProps {
  left: EyePrescription;
  right: EyePrescription;
  clientName?: string | null;
  dimLeft?: boolean;
  dimRight?: boolean;
}

export function formatCorrection({
  sphere,
  cyl,
  axe,
}: EyePrescription): string {
  const hasCyl = cyl !== null && cyl !== undefined;
  const hasAxe = axe !== null && axe !== undefined;
  if (!hasCyl || !hasAxe) return String(sphere);
  return `${sphere} (${cyl} à ${axe})`;
}

interface EyePanelProps {
  side: "OG" | "OD";
  eye: EyePrescription;
  dimmed: boolean;
  className?: string;
}

function EyePanel({ side, eye, dimmed, className = "" }: EyePanelProps) {
  return (
    <div
      className={`flex flex-col gap-3 p-3 transition-opacity ${
        dimmed ? "opacity-30" : ""
      } ${className}`}
    >
      <span className="w-fit rounded-md bg-accent-2/20 px-1.5 py-0.5 text-[20px] font-semibold text-accent-2">
        {side}
      </span>

      <dl className="flex flex-col gap-1">
        <div className="flex gap-2">
          <dt className="text-text/70">Ro</dt>
          <dd className="font-semibold">{eye.ro}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text/70">Dia</dt>
          <dd className="font-semibold">{eye.dia}</dd>
        </div>
      </dl>

      <p className="whitespace-nowrap text-lg font-semibold">
        {formatCorrection(eye)}
      </p>
    </div>
  );
}

export default function LensComponentCard({
  left,
  right,
  clientName,
  dimLeft = false,
  dimRight = false,
}: LensComponentCardProps) {
  return (
    <div
      className={`grid h-full w-full grid-cols-2 overflow-hidden rounded-lg border-[1.5px] border-stroke bg-card ${
        clientName ? "grid-rows-[auto_1fr]" : ""
      }`}
    >
      {clientName && (
        <div className="col-span-2 flex items-center gap-2 border-b-[1.5px] border-stroke bg-accent-2/5 px-3 py-2">
          <User size={16} className="shrink-0 text-accent-2" />
          <span className="truncate font-semibold" title={clientName}>
            {clientName}
          </span>
        </div>
      )}

      <EyePanel side="OG" eye={left} dimmed={dimLeft} />
      <EyePanel
        side="OD"
        eye={right}
        dimmed={dimRight}
        className="border-l-[1.5px] border-stroke"
      />
    </div>
  );
}
