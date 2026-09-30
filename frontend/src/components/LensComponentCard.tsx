import { Pencil, Trash2, User } from "lucide-react";

export interface EyePrescription {
  ro: number;
  dia: number;
  sphere: number;
  cyl?: number | null;
  axe?: number | null;
}

// An eye counts as present only if it exists AND its required values are filled.
// The API may send an object with null fields for a missing eye, not just null.
export const hasEye = (
  eye: EyePrescription | null | undefined,
): eye is EyePrescription =>
  !!eye && eye.ro != null && eye.dia != null && eye.sphere != null;

interface LensComponentCardProps {
  left?: EyePrescription | null;
  right?: EyePrescription | null;
  clientName?: string | null;
  note?: string | null;
  dimLeft?: boolean;
  dimRight?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
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
  note,
  dimLeft = false,
  dimRight = false,
  onEdit,
  onDelete,
}: LensComponentCardProps) {
  const showLeft = hasEye(left);
  const showRight = hasEye(right);
  if (!showLeft && !showRight) return null;

  const bothEyes = showLeft && showRight;
  const showHeader = !!clientName || !!onEdit || !!onDelete;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border-[1.5px] border-stroke bg-card">
      {showHeader && (
        <div className="flex items-center gap-2 border-b-[1.5px] border-stroke bg-accent-2/5 px-3 py-2">
          <span className="flex min-w-0 flex-1 items-center gap-2">
            {clientName && (
              <>
                <User size={16} className="shrink-0 text-accent-2" />
                <span className="truncate font-semibold" title={clientName}>
                  {clientName}
                </span>
              </>
            )}
          </span>

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              aria-label="Modifier la lentille"
              title="Modifier"
              className="flex shrink-0 cursor-pointer items-center rounded-md p-1 text-[#5a5a5a] hover:bg-[#f3f3f3] hover:text-accent-2"
            >
              <Pencil size={16} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Supprimer la lentille"
              title="Supprimer"
              className="flex shrink-0 cursor-pointer items-center rounded-md p-1 text-[#5a5a5a] hover:bg-[#f3f3f3] hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )}

      <div
        className={`grid flex-1 ${bothEyes ? "grid-cols-2" : "grid-cols-1"}`}
      >
        {showLeft && <EyePanel side="OG" eye={left} dimmed={dimLeft} />}
        {showRight && (
          <EyePanel
            side="OD"
            eye={right}
            dimmed={dimRight}
            className={bothEyes ? "border-l-[1.5px] border-stroke" : ""}
          />
        )}
      </div>

      {note && (
        <p className="whitespace-pre-wrap break-words border-t-[1.5px] border-stroke px-3 py-2 text-sm text-text/70">
          {note}
        </p>
      )}
    </div>
  );
}
