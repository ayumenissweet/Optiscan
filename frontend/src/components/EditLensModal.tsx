import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { getApiBase } from "../api";
import { hasEye, type EyePrescription } from "./LensComponentCard";
import type { LensOrder } from "../pages/BatchCheckout";

type EyeKey = "left_eye" | "right_eye";
type FieldKey = "ro" | "dia" | "sphere" | "cyl" | "axe";

interface EyeForm {
  enabled: boolean;
  values: Record<FieldKey, string>;
}

const FIELDS: { key: FieldKey; label: string; step: string }[] = [
  { key: "ro", label: "Ro", step: "0.1" },
  { key: "dia", label: "Dia", step: "0.1" },
  { key: "sphere", label: "Sphère", step: "0.25" },
  { key: "cyl", label: "Cyl", step: "0.25" },
  { key: "axe", label: "Axe", step: "1" },
];

const EYES: { key: EyeKey; side: string; title: string }[] = [
  { key: "left_eye", side: "OG", title: "Œil gauche" },
  { key: "right_eye", side: "OD", title: "Œil droit" },
];

const EMPTY_VALUES: Record<FieldKey, string> = {
  ro: "",
  dia: "",
  sphere: "",
  cyl: "",
  axe: "",
};

const toForm = (eye: EyePrescription | null | undefined): EyeForm => {
  if (!hasEye(eye)) return { enabled: false, values: { ...EMPTY_VALUES } };
  return {
    enabled: true,
    values: {
      ro: String(eye.ro),
      dia: String(eye.dia),
      sphere: String(eye.sphere),
      cyl: eye.cyl != null ? String(eye.cyl) : "",
      axe: eye.axe != null ? String(eye.axe) : "",
    },
  };
};

const parse = (s: string): number | null => {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

// Reads the message NestJS sends back (string or array of strings).
export async function readApiError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    const msg = data?.message;
    if (Array.isArray(msg)) return msg.join(", ");
    if (typeof msg === "string") return msg;
  } catch {
    /* body is not JSON */
  }
  return `Erreur ${response.status} ${response.statusText}`.trim();
}

interface EditLensModalProps {
  order: LensOrder;
  onClose: () => void;
  onSaved: (id: string, patch: Partial<LensOrder>) => void;
}

export default function EditLensModal({
  order,
  onClose,
  onSaved,
}: EditLensModalProps) {
  const [eyes, setEyes] = useState<Record<EyeKey, EyeForm>>({
    left_eye: toForm(order.left_eye),
    right_eye: toForm(order.right_eye),
  });
  const [note, setNote] = useState<string>(order.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const setField = (eye: EyeKey, field: FieldKey, value: string) =>
    setEyes((prev) => ({
      ...prev,
      [eye]: {
        ...prev[eye],
        values: { ...prev[eye].values, [field]: value },
      },
    }));

  const setEnabled = (eye: EyeKey, enabled: boolean) =>
    setEyes((prev) => ({ ...prev, [eye]: { ...prev[eye], enabled } }));

  const validate = (): string | null => {
    if (!eyes.left_eye.enabled && !eyes.right_eye.enabled) {
      return "Au moins un œil est requis. Pour retirer toute la paire, supprimez la lentille.";
    }
    for (const { key, side } of EYES) {
      const { enabled, values } = eyes[key];
      if (!enabled) continue;
      for (const f of FIELDS) {
        if (Number.isNaN(parse(values[f.key]))) {
          return `${side} : valeur invalide pour ${f.label}.`;
        }
      }
      for (const req of ["ro", "dia", "sphere"] as const) {
        if (parse(values[req]) === null) {
          return `${side} : ${FIELDS.find((f) => f.key === req)!.label} est obligatoire.`;
        }
      }
      if ((parse(values.cyl) === null) !== (parse(values.axe) === null)) {
        return `${side} : Cyl et Axe vont ensemble (remplissez les deux ou aucun).`;
      }
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    const cleanNote = note.trim() === "" ? null : note.trim();
    const body: Record<string, unknown> = { note: cleanNote };
    const patch: Partial<LensOrder> = { note: cleanNote };

    for (const { key } of EYES) {
      const { enabled, values } = eyes[key];
      const existed = hasEye(order[key]);

      if (enabled) {
        const eye = {
          ro: parse(values.ro) as number,
          dia: parse(values.dia) as number,
          sphere: parse(values.sphere) as number,
          cyl: parse(values.cyl),
          axe: parse(values.axe),
        };
        body[key] = eye;
        patch[key] = eye;
      } else if (existed) {
        // The backend merges objects and ignores null/undefined eyes, so an
        // eye is removed by sending every field as null (hasEye() => false).
        body[key] = { ro: null, dia: null, sphere: null, cyl: null, axe: null };
        patch[key] = null;
      }
    }

    try {
      setSaving(true);
      setError(null);
      const response = await fetch(
        `${getApiBase()}/lenses/${encodeURIComponent(order.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        setError(await readApiError(response));
        return;
      }
      onSaved(order.id, patch);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? `Modification impossible : ${err.message}`
          : "Modification impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-lens-title"
        onSubmit={handleSubmit}
        className="flex max-h-full w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-xl border-[1.5px] border-stroke bg-card p-5 shadow-lg"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col">
            <h2 id="edit-lens-title" className="text-xl font-semibold">
              Modifier la lentille
            </h2>
            {order.client?.name && (
              <p className="text-text/70">{order.client.name}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Fermer"
            className="cursor-pointer rounded-md p-1 text-[#5a5a5a] hover:bg-[#f3f3f3] disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {EYES.map(({ key, side, title }) => {
            const eye = eyes[key];
            return (
              <fieldset
                key={key}
                className="flex flex-col gap-3 rounded-lg border-[1.5px] border-stroke p-3"
              >
                <legend className="sr-only">{title}</legend>
                <div className="flex items-center justify-between">
                  <span className="w-fit rounded-md bg-accent-2/20 px-1.5 py-0.5 text-[20px] font-semibold text-accent-2">
                    {side}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEnabled(key, !eye.enabled)}
                    className="cursor-pointer text-sm text-accent-2 hover:underline"
                  >
                    {eye.enabled ? "Retirer cet œil" : "Ajouter cet œil"}
                  </button>
                </div>

                {eye.enabled ? (
                  <div className="grid grid-cols-2 gap-3">
                    {FIELDS.map((f) => (
                      <label
                        key={f.key}
                        className="flex flex-col gap-1 text-sm text-text/70"
                      >
                        {f.label}
                        <input
                          type="number"
                          inputMode="decimal"
                          step={f.step}
                          value={eye.values[f.key]}
                          onChange={(e) => setField(key, f.key, e.target.value)}
                          className="h-[38px] rounded-xl border border-[#d2d2d2] bg-white px-3 text-sm text-text outline-none focus:border-accent-2"
                        />
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text/70">Pas de lentille.</p>
                )}
              </fieldset>
            );
          })}
        </div>

        <label className="flex flex-col gap-1 text-sm text-text/70">
          Note
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="rounded-xl border border-[#d2d2d2] bg-white px-3 py-2 text-sm text-text outline-none focus:border-accent-2"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="cursor-pointer rounded-xl border border-[#d2d2d2] bg-white px-4 py-2 text-sm hover:bg-[#f3f3f3] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer rounded-xl bg-accent-2 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
