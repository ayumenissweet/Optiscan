import { useEffect, useState } from "react";
import { ClipboardPaste, Loader2, Minus, Plus, Upload, X } from "lucide-react";
import { SearchableSelect } from "../components/SearchableSelect";
import { getApiBase } from "../api";
import { BRANDS_UPDATED_EVENT } from "../components/Navbar";

interface NewOrderProps {}

type SelectValue = string;

interface Prescription {
  ro: SelectValue | null;
  dia: SelectValue | null;
  sph: SelectValue | null;
  cyl: SelectValue | null;
  axe: SelectValue | null;
}

/** Shape expected by EyePrescriptionDto on POST /create */
interface EyePrescriptionPayload {
  ro: number;
  dia: number;
  sphere: number;
  cyl?: number;
  axe?: number;
}

/** Shape returned by GET /clients (and POST /clients) */
interface Client {
  id: string | number;
  name: string;
  phone_number?: string | null;
}

/** Shape expected by createClientDto on POST /clients */
interface CreateClientPayload {
  name: string;
  phone_number?: string;
}

/** Shape returned by GET /brand (and PATCH /brand) */
interface LensBrand {
  name: string;
}

const CLIENTS_PATH = "/clients";
const BRANDS_PATH = "/brand";
const CLIENT_FIELD = "clientId";
const NOTE_MAX_WORDS = 20;

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

type Option = { value: string | null; label: string };

const makeOptions = (nums: number[], decimals = 2, signed = false): Option[] =>
  nums.map((n) => ({
    value: String(n),
    label: (signed && n > 0 ? "+" : "") + n.toFixed(decimals),
  }));
const blank = (label: string): Option => ({
  value: null,
  label: `-- ${label} --`,
});

const roOptions = makeOptions([8.4, 8.6, 8.7, 8.9, 9]);
const diaOptions = makeOptions([14, 14.2], 1);
// -10, -8, ... +10
const sphOptions = makeOptions(
  Array.from({ length: 11 }, (_, i) => i * 2 - 10),
  2,
  true,
);
// blank, then -0.25 ... -2.25
const cylOptions = [
  blank("cyl"),
  ...makeOptions(Array.from({ length: 9 }, (_, i) => -(i + 1) * 0.25)),
];
const axeOptions = [blank("axe"), ...makeOptions([10, 20, 30, 45, 90, 180], 0)];

/** Stepper buttons: `start` is used when the field is still empty. */
interface Stepper {
  start?: number;
  dec?: number;
  inc?: number;
  max?: number;
}
const NO_STEPPER: Stepper = {};
const STEPPERS: Record<string, Stepper> = {
  sph: { start: 0, dec: -0.25, inc: 0.25 },
  ro: { start: 8.4, inc: 0.1 },
  axe: { start: 10, inc: 10, max: 180 },
};

const emptyPrescription: Prescription = {
  ro: null,
  dia: null,
  sph: null,
  cyl: null,
  axe: null,
};

/** string select value -> number, or undefined if empty/invalid */
function strToNum(v: SelectValue | null): number | undefined {
  if (v === null || v.trim() === "") return undefined;
  const n = parseFloat(v);
  return Number.isNaN(n) ? undefined : n;
}

function extractMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  const fromMessage = (m: unknown): string | null => {
    if (typeof m === "string" && m.trim() !== "") return m;
    if (Array.isArray(m) && m.length > 0) return m.join(" · ");
    if (m && typeof m === "object") return extractMessage(m); // nested
    return null;
  };

  return (
    fromMessage(b.message) ??
    (typeof b.error === "string" && b.error.trim() !== "" ? b.error : null)
  );
}


async function getApiErrorMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  let raw = "";
  try {
    raw = await res.text();
  } catch {
    // body unreadable, use the fallback
  }

  console.error(
    `[API error] ${res.status} ${res.statusText} ${res.url}\n`,
    raw.slice(0, 1000) || "(empty body)",
  );

  // 1) JSON body from the backend
  try {
    const msg = extractMessage(JSON.parse(raw));
    if (msg) return msg;
  } catch {
    // not JSON
  }

  // 2) Short plain-text body (not an HTML error page from a proxy)
  const text = raw.trim();
  if (text !== "" && text.length <= 200 && !text.startsWith("<")) {
    return text;
  }

  // 3) Nothing usable: say *why* it's generic
  const looksLikeHtml = text.startsWith("<");
  return looksLikeHtml
    ? `${fallback} The server or a proxy returned an HTML page instead of an API error.`
    : `${fallback} The server returned no error message.`;
}

/** True if the user has filled in at least one field of this eye */
function isEyeTouched(p: Prescription): boolean {
  return Object.values(p).some((v) => v !== null && v.trim() !== "");
}

/**
 * Builds the DTO payload for one eye.
 * - Untouched eye (nothing filled): returns { payload: null, missing: [] }.
 * - Touched eye with ro/dia/sph missing: returns payload null + the missing fields.
 */
function toEyePayload(p: Prescription): {
  payload: EyePrescriptionPayload | null;
  missing: string[];
} {
  if (!isEyeTouched(p)) {
    return { payload: null, missing: [] };
  }

  const missing: string[] = [];
  const ro = strToNum(p.ro);
  const dia = strToNum(p.dia);
  const sphere = strToNum(p.sph);

  if (ro === undefined) missing.push("Ro");
  if (dia === undefined) missing.push("Dia");
  if (sphere === undefined) missing.push("Sph");

  if (missing.length > 0) {
    return { payload: null, missing };
  }

  const payload: EyePrescriptionPayload = {
    ro: ro as number,
    dia: dia as number,
    sphere: sphere as number,
  };

  const cyl = strToNum(p.cyl);
  const axe = strToNum(p.axe);
  if (cyl !== undefined) payload.cyl = cyl;
  if (axe !== undefined) payload.axe = axe;

  return { payload, missing: [] };
}

export default function NewOrder({}: NewOrderProps) {
  const [brands, setBrands] = useState<LensBrand[]>([]);
  const [brand, setBrand] = useState<string | null>(null);
  const [brandsError, setBrandsError] = useState<string | null>(null);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  const [note, setNote] = useState("");

  const [og, setOg] = useState<Prescription>(emptyPrescription);
  const [od, setOd] = useState<Prescription>(emptyPrescription);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [pasteMessage, setPasteMessage] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;

      if (!files?.length) return;

      const image = Array.from(files).find((file) =>
        file.type.startsWith("image/"),
      );

      if (!image) return;

      setImageFile(image);
      setImagePreview(URL.createObjectURL(image));
      setPasteMessage(null);
    };

    window.addEventListener("paste", handlePaste);

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${getApiBase()}${CLIENTS_PATH}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(
            await getApiErrorMessage(
              res,
              `Couldn't load clients (${res.status}).`,
            ),
          );
        }

        const data: Client[] = await res.json();
        setClients(data);
        setClientsError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        setClientsError(
          err instanceof Error ? err.message : "Couldn't load clients.",
        );
      }
    })();

    (async () => {
      try {
        const res = await fetch(`${getApiBase()}${BRANDS_PATH}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(
            await getApiErrorMessage(
              res,
              `Couldn't load brands (${res.status}).`,
            ),
          );
        }

        const data: LensBrand[] = await res.json();
        setBrands(data);
        setBrandsError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        setBrandsError(
          err instanceof Error ? err.message : "Couldn't load brands.",
        );
      }
    })();

    return () => {
      window.removeEventListener("paste", handlePaste);
      controller.abort();
    };
  }, []);

  const brandOptions = brands.map((b) => ({
    value: b.name,
    label: b.name,
  }));

  const handleBrandCreated = (created: LensBrand) => {
    setBrands((previous) =>
      previous.some((b) => b.name === created.name)
        ? previous
        : [...previous, created],
    );
    setBrand(created.name);
    setBrandsError(null);
    setIsBrandModalOpen(false);
    // let the Navbar dropdown refresh
    window.dispatchEvent(new Event(BRANDS_UPDATED_EVENT));
  };

  const clientOptions = clients.map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  const handleClientCreated = (client: Client) => {
    setClients((previous) => [...previous, client]);
    setClientId(String(client.id));
    setClientsError(null);
    setIsClientModalOpen(false);
  };

  const handlePrescriptionChange = (
    eye: "og" | "od",
    name: string,
    value: string | null,
  ) => {
    const setter = eye === "og" ? setOg : setOd;

    setter((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setPasteMessage(null);
  };

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handlePasteClick = async () => {
    setPasteMessage(null);

    try {
      if (!navigator.clipboard?.read) {
        throw new Error("unsupported");
      }

      const items = await navigator.clipboard.read();

      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));

        if (!type) continue;

        const blob = await item.getType(type);
        const file = new File([blob], `pasted-image.${type.split("/")[1]}`, {
          type,
        });

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        return;
      }

      setPasteMessage("No image found in the clipboard.");
    } catch (err) {
      console.error("[paste] failed:", err);
      setPasteMessage(
        "Couldn't read the clipboard. Allow clipboard access, or press Ctrl+V.",
      );
    }
  };

  const handleSubmit = async () => {
    setSubmitMessage(null);

    if (!brand) {
      setSubmitMessage({ type: "error", text: "Select a brand." });
      return;
    }

    if (!clientId) {
      setSubmitMessage({ type: "error", text: "Select a client." });
      return;
    }

    if (countWords(note) > NOTE_MAX_WORDS) {
      setSubmitMessage({
        type: "error",
        text: `The note is limited to ${NOTE_MAX_WORDS} words.`,
      });
      return;
    }

    const { payload: leftPayload, missing: leftMissing } = toEyePayload(og);
    const { payload: rightPayload, missing: rightMissing } = toEyePayload(od);

    // At least one eye is required
    if (!isEyeTouched(og) && !isEyeTouched(od)) {
      setSubmitMessage({
        type: "error",
        text: "Fill in at least one eye (OG or OD).",
      });
      return;
    }

    // Any eye that has been started must be complete (Ro, Dia, Sph)
    if (leftMissing.length || rightMissing.length) {
      const parts: string[] = [];
      if (leftMissing.length) parts.push(`OG: ${leftMissing.join(", ")}`);
      if (rightMissing.length) parts.push(`OD: ${rightMissing.join(", ")}`);
      setSubmitMessage({
        type: "error",
        text: `Missing required fields — ${parts.join(" · ")}`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("brand", brand);
      formData.append(CLIENT_FIELD, clientId);
      if (note.trim() !== "") {
        formData.append("note", note.trim());
      }
      if (leftPayload) {
        formData.append("left_eye", JSON.stringify(leftPayload));
      }
      if (rightPayload) {
        formData.append("right_eye", JSON.stringify(rightPayload));
      }
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const res = await fetch(`${getApiBase()}/create`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(
          await getApiErrorMessage(
            res,
            `Couldn't create the order (${res.status}).`,
          ),
        );
      }

      setSubmitMessage({
        type: "success",
        text: "Order created successfully.",
      });
    } catch (err) {
      setSubmitMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Something went wrong while creating the order.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-7 font-sans text-gray-900 sm:px-6 md:px-10">
      <h1 className="mb-10 text-[28px] font-semibold tracking-[-0.02em] md:mb-14 md:text-[32px]">
        Ajouter Une Lentille
      </h1>

      <div className="flex flex-col items-start gap-8 md:flex-row md:gap-14">
        <section className="w-full shrink-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:w-[460px]">
          <div className="mb-4 flex items-start gap-3">
            <div className="w-[156px] shrink-0">
              <SearchableSelect
                options={brandOptions}
                name="brand"
                value={brand}
                placeholder="Marque"
                handleChange={(_, value) => setBrand(value)}
              />

              <button
                type="button"
                onClick={() => setIsBrandModalOpen(true)}
                className="mt-1 text-xs text-blue-700 hover:underline cursor-pointer"
              >
                Ajouter Une Marque
              </button>

              {brandsError && (
                <p className="mt-1 text-xs text-red-600">{brandsError}</p>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <SearchableSelect
                options={clientOptions}
                name="client"
                value={clientId}
                placeholder="Client"
                handleChange={(_, value) => setClientId(value)}
              />

              <button
                type="button"
                onClick={() => setIsClientModalOpen(true)}
                className="mt-1 text-xs text-blue-700 hover:underline cursor-pointer"
              >
                Ajouter Un Client
              </button>

              {clientsError && (
                <p className="mt-1 text-xs text-red-600">{clientsError}</p>
              )}
            </div>
          </div>

          <EyePrescription
            label="OG"
            values={og}
            onChange={(name, value) =>
              handlePrescriptionChange("og", name, value)
            }
          />

          <div className="relative my-5">
            <div className="h-px w-full bg-gray-200" />
            <div className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-200 bg-white" />
          </div>

          <EyePrescription
            label="OD"
            values={od}
            onChange={(name, value) =>
              handlePrescriptionChange("od", name, value)
            }
          />

          <div className="mt-4">
            <div className="mb-1 flex items-baseline justify-between">
              <label htmlFor="order-note" className="text-base font-medium">
                Note
              </label>
              <span
                className={`text-xs ${
                  countWords(note) > NOTE_MAX_WORDS
                    ? "text-red-600"
                    : "text-gray-400"
                }`}
              >
                {countWords(note)}/{NOTE_MAX_WORDS} words
              </span>
            </div>

            <textarea
              id="order-note"
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional, a short note (10-20 words)"
              className="
                h-16
                w-full
                resize-none
                rounded-lg
                border
                border-gray-200
                bg-white
                px-2
                py-1
                text-sm
                text-gray-900
                outline-none
                placeholder:text-gray-400
                focus:border-blue-600
              "
            />
          </div>

          {submitMessage && (
            <p
              className={`mt-3 text-sm ${
                submitMessage.type === "error"
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {submitMessage.text}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="
              mt-3
              flex
              h-[49px]
              w-full
              items-center
              justify-center
              gap-2
              rounded-lg
              bg-blue-700
              text-lg
              font-semibold
              text-white
              transition
              hover:brightness-95
              active:scale-[0.99]
              disabled:cursor-not-allowed
              disabled:opacity-60
              cursor-pointer
            "
          >
            {isSubmitting && <Loader2 size={20} className="animate-spin" />}
            Continue
          </button>
        </section>

        <section className="flex w-full flex-col items-center md:w-[535px]">
          <label
            htmlFor="lens-image"
            className="
              flex
              h-[280px]
              w-full
              cursor-pointer
              items-center
              justify-center
              overflow-hidden
              rounded-xl
              border
              border-gray-200
              bg-white
              transition
              hover:bg-gray-50
              md:h-[355px]
            "
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Uploaded prescription"
                className="h-full w-full object-contain p-4"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-gray-400">
                <Upload size={48} strokeWidth={1.8} />
                <span className="text-lg font-medium">Upload An Image</span>
              </div>
            )}
          </label>

          <input
            id="lens-image"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />

          {pasteMessage && (
            <p className="mt-3 text-center text-sm text-red-600">
              {pasteMessage}
            </p>
          )}

          <button
            type="button"
            onClick={handlePasteClick}
            className="
              mt-4
              flex
              h-11
              items-center
              gap-2
              rounded-lg
              bg-blue-600
              px-4
              text-base
              font-medium
              text-white
              transition
              hover:brightness-95
              active:scale-[0.98]
              cursor-pointer
            "
          >
            <ClipboardPaste size={20} strokeWidth={2} />
            Paste Image
          </button>
        </section>
      </div>

      {isBrandModalOpen && (
        <AddBrandModal
          onClose={() => setIsBrandModalOpen(false)}
          onCreated={handleBrandCreated}
        />
      )}

      {isClientModalOpen && (
        <AddClientModal
          onClose={() => setIsClientModalOpen(false)}
          onCreated={handleClientCreated}
        />
      )}
    </main>
  );
}

interface AddClientModalProps {
  onClose: () => void;
  onCreated: (client: Client) => void;
}

function AddClientModal({ onClose, onCreated }: AddClientModalProps) {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, isSaving]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedPhone = phoneNumber.trim();

    if (trimmedName === "") {
      setError("name not provided for the client");
      return;
    }

    const payload: CreateClientPayload = { name: trimmedName };
    if (trimmedPhone !== "") payload.phone_number = trimmedPhone;

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`${getApiBase()}${CLIENTS_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(
          await getApiErrorMessage(
            res,
            `Couldn't create the client (${res.status}).`,
          ),
        );
      }

      const created: Client = await res.json();
      onCreated(created);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while creating the client.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-client-title"
        className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-lg"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="add-client-title" className="text-lg font-semibold">
            New client
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-60"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-3">
          <label
            htmlFor="client-name"
            className="mb-1 block text-sm font-medium"
          >
            Nom
          </label>
          <input
            id="client-name"
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-600"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="client-phone"
            className="mb-1 block text-sm font-medium"
          >
            Telephone{" "}
            <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="client-phone"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-600"
          />
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving && <Loader2 size={16} className="animate-spin" />}
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}

interface AddBrandModalProps {
  onClose: () => void;
  onCreated: (brand: LensBrand) => void;
}

function AddBrandModal({ onClose, onCreated }: AddBrandModalProps) {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, isSaving]);

  const handleSave = async () => {
    const trimmedName = name.trim();

    if (trimmedName === "") {
      setError("name not provided for the brand");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // The backend route is @Patch("brand") with { brand } in the body
      const res = await fetch(`${getApiBase()}${BRANDS_PATH}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: trimmedName }),
      });

      if (!res.ok) {
        throw new Error(
          await getApiErrorMessage(
            res,
            `Couldn't create the brand (${res.status}).`,
          ),
        );
      }

      // Use the returned entity when it has a name, otherwise the typed name
      let created: LensBrand = { name: trimmedName };
      try {
        const body: Partial<LensBrand> | null = await res.json();
        if (body && typeof body.name === "string" && body.name !== "") {
          created = { name: body.name };
        }
      } catch {
        // empty / non-JSON body: keep the typed name
      }

      onCreated(created);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while creating the brand.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-brand-title"
        className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-lg"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="add-brand-title" className="text-lg font-semibold">
            New brand
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-60"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4">
          <label
            htmlFor="brand-name"
            className="mb-1 block text-sm font-medium"
          >
            Nom
          </label>
          <input
            id="brand-name"
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-600"
          />
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving && <Loader2 size={16} className="animate-spin" />}
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}

interface EyePrescriptionProps {
  label: "OG" | "OD";
  values: Prescription;
  onChange: (name: string, value: string | null) => void;
}

const FIELDS: {
  name: keyof Prescription;
  label: string;
  options: Option[];
}[][] = [
  // Row 1: only two fields, so Sph gets a wide cell for its -/+ buttons
  [
    { name: "ro", label: "Ro", options: roOptions },
    { name: "sph", label: "Sph", options: sphOptions },
  ],
  // Row 2: three compact fields
  [
    { name: "dia", label: "Dia", options: diaOptions },
    { name: "cyl", label: "Cyl", options: cylOptions },
    { name: "axe", label: "Axe", options: axeOptions },
  ],
];

function EyePrescription({ label, values, onChange }: EyePrescriptionProps) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-medium">{label}</h2>
      {FIELDS.map((row, i) => (
        <div
          key={i}
          className={
            i === 0 ? "mb-3 grid grid-cols-2 gap-4" : "grid grid-cols-3 gap-2"
          }
        >
          {row.map((f) => (
            <PrescriptionSelect
              key={f.name}
              {...f}
              value={values[f.name]}
              onChange={onChange}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface PrescriptionSelectProps {
  label: string;
  name: string;
  value: string | null;
  options: Option[];
  onChange: (name: string, value: string | null) => void;
}

function StepButton({
  icon: Icon,
  title,
  onClick,
}: {
  icon: typeof Plus;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded border border-gray-200 text-gray-500 hover:bg-gray-100 active:scale-95"
    >
      <Icon size={12} />
    </button>
  );
}

function PrescriptionSelect({
  label,
  name,
  value,
  options,
  onChange,
}: PrescriptionSelectProps) {
  // never undefined (dia/cyl have no buttons), so render-time reads are safe
  const stepper = STEPPERS[name] ?? NO_STEPPER;

  const step = (by: number) => {
    const current = strToNum(value);
    if (current === undefined) {
      if (stepper.start !== undefined) onChange(name, String(stepper.start));
      return;
    }
    const next = Math.round((current + by) * 100) / 100;
    onChange(name, String(Math.min(stepper.max ?? Infinity, next)));
  };

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="w-8 shrink-0 text-sm">{label}</span>
      {stepper.dec !== undefined && (
        <StepButton
          icon={Minus}
          title={String(stepper.dec)}
          onClick={() => step(stepper.dec!)}
        />
      )}
      <div className="min-w-0 flex-1">
        <SearchableSelect<string>
          options={options}
          name={name}
          value={value}
          placeholder={label}
          handleChange={onChange}
        />
      </div>
      {stepper.inc !== undefined && (
        <StepButton
          icon={Plus}
          title={`+${stepper.inc}`}
          onClick={() => step(stepper.inc!)}
        />
      )}
    </div>
  );
}