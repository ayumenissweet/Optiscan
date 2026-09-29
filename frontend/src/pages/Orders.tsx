import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchableSelect } from "../components/SearchableSelect";
import DraftCard, { OrderStatus } from "../components/DraftCard";
import { getApiBase } from "../api";

export type ToricBrand = "Soleko" | "Cornelia" | "Versa View";

interface OrdersProps {
  brand: ToricBrand;
}

export interface FilterTypes {
  order_number: number | null;
  year: number | null;
}

interface Batch {
  id: string;
  brand: ToricBrand;
  code: number | null;
  status: OrderStatus;
  created_at: string;
  exported_at: string;
}

const STATUS_MAP: Record<string, OrderStatus> = {
  Draft: OrderStatus.DRAFT,
  Sent: OrderStatus.SENT,
  Received: OrderStatus.RECEIVED,
  DRAFT: OrderStatus.DRAFT,
  SENT: OrderStatus.SENT,
  RECEIVED: OrderStatus.RECEIVED,
};

function toOrderStatus(status: string): OrderStatus {
  return STATUS_MAP[status] ?? OrderStatus.DRAFT;
}

interface ModalShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function ModalShell({ title, onClose, children }: ModalShellProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

interface ExportModalProps {
  onCancel: () => void;
  onConfirm: (customCode: number | null) => void;
}

function ExportModal({ onCancel, onConfirm }: ExportModalProps) {
  const [value, setValue] = useState("");
  const trimmed = value.trim();
  const parsed = trimmed === "" ? null : Number(trimmed);
  const invalid =
    parsed !== null && (!Number.isInteger(parsed) || (parsed as number) < 1);

  return (
    <ModalShell title="Exporter la commande" onClose={onCancel}>
      <p className="text-sm text-gray-600">
        Ajoutez un code si vous en êtes déjà, par exemple, au lot 82 dans votre
        ancien logiciel ou vos notes. Laissez vide pour utiliser le code suivant
        automatiquement.
      </p>
      <div className="flex flex-col gap-1">
        <label htmlFor="customCode" className="text-sm font-medium">
          Code personnalisé (optionnel)
        </label>
        <input
          id="customCode"
          type="number"
          min={1}
          step={1}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !invalid) onConfirm(parsed);
          }}
          placeholder="ex. 82"
          className="rounded border border-gray-300 px-3 py-2"
        />
        {invalid && (
          <span className="text-sm text-red-500">
            Entrez un nombre entier positif.
          </span>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-gray-300 px-4 py-2"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={invalid}
          onClick={() => onConfirm(parsed)}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-40"
        >
          Exporter
        </button>
      </div>
    </ModalShell>
  );
}

interface DeleteModalProps {
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteModal({ deleting, onCancel, onConfirm }: DeleteModalProps) {
  return (
    <ModalShell title="Supprimer le brouillon" onClose={onCancel}>
      <p className="text-sm text-gray-600">
        Êtes-vous sûr ? Ce brouillon sera supprimé définitivement.
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="rounded border border-gray-300 px-4 py-2"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={deleting}
          className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-40"
        >
          {deleting ? "Suppression..." : "Supprimer"}
        </button>
      </div>
    </ModalShell>
  );
}

export default function Orders({ brand }: OrdersProps) {
  const navigate = useNavigate();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportTarget, setExportTarget] = useState<Batch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [filter, setFilter] = useState<FilterTypes>({
    order_number: null,
    year: null,
  });

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${getApiBase()}/batches?brand=${encodeURIComponent(brand)}`,
      );
      if (!response.ok) {
        setError(
          `Batch Fetching Error: ${response.status} ${response.statusText}`,
        );
        return;
      }

      const data: Batch[] = await response.json();
      setBatches(data);
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error
          ? `Batch Fetching Error: ${e.message}`
          : `An unknown error occured : ${e}`,
      );
    } finally {
      setLoading(false);
    }
  }, [getApiBase(), brand]);

  useEffect(() => {
    setFilter({ order_number: null, year: null });
    fetchBatches();
  }, [fetchBatches]);

  const handleOrderNumChange = (_name: string, value: number | null) => {
    setFilter((prev) => ({ ...prev, order_number: value }));
  };

  const handleYearChange = (_name: string, value: number | null) => {
    setFilter((prev) => ({ ...prev, year: value }));
  };

  const nextOrderCode = useMemo(
    () =>
      batches.reduce(
        (max, b) => (b.code !== null && b.code > max ? b.code : max),
        0,
      ) + 1,
    [batches],
  );

  const handleExport = async (batch: Batch, customCode: number | null) => {
    try {
      setExportingId(batch.id);
      const response = await fetch(`${getApiBase()}/export/${batch.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customCode !== null ? { customCode } : {}),
      });

      if (!response.ok) {
        setError(`Export Error: ${response.status} ${response.statusText}`);
        return;
      }

      const blob = await response.blob();

      const headerCode = response.headers.get("X-Batch-Code");
      const parsedHeaderCode = headerCode !== null ? Number(headerCode) : NaN;

      const code = !Number.isNaN(parsedHeaderCode)
        ? parsedHeaderCode
        : (batch.code ?? nextOrderCode);

      const formattedCode = String(code).padStart(2, "0");

      const year = batch.created_at
        ? new Date(batch.created_at).getFullYear() % 100
        : "00";

      let brandPrefix = brand.toUpperCase();
      if (brandPrefix === "VERSA VIEW") {
        brandPrefix = "VERSA";
      }

      const fileName = `${brandPrefix}**${formattedCode}_${year}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);

      await fetchBatches();
    } catch (e) {
      setError(
        e instanceof Error
          ? `Export Error: ${e.message}`
          : `An unknown error occured : ${e}`,
      );
    } finally {
      setExportingId(null);
    }
  };

  const handleDelete = async (batch: Batch) => {
    try {
      setDeleting(true);
      const response = await fetch(`${getApiBase()}/${batch.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setError(`Delete Error: ${response.status} ${response.statusText}`);
        return;
      }

      setDeleteTarget(null);
      await fetchBatches();
    } catch (e) {
      setError(
        e instanceof Error
          ? `Delete Error: ${e.message}`
          : `An unknown error occured : ${e}`,
      );
    } finally {
      setDeleting(false);
    }
  };

  const orderNumberOptions = useMemo(() => {
    const unique = Array.from(
      new Set(
        batches
          .map((b) => b.code)
          .filter((n): n is number => n !== null && n !== undefined),
      ),
    ).sort((a, b) => a - b);

    return [
      { label: "-- Ordre --", value: null },
      ...unique.map((n) => ({ label: `#${n}`, value: n })),
    ];
  }, [batches]);

  const yearOptions = useMemo(() => {
    const unique = Array.from(
      new Set(
        batches
          .map((b) =>
            b.created_at ? new Date(b.created_at).getFullYear() : null,
          )
          .filter((y): y is number => y !== null && !isNaN(y)),
      ),
    ).sort((a, b) => b - a);

    return [
      { label: "-- Année --", value: null },
      ...unique.map((y) => ({ label: String(y), value: y })),
    ];
  }, [batches]);

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      if (filter.order_number !== null && b.code !== filter.order_number) {
        return false;
      }
      if (filter.year !== null) {
        const batchYear = b.created_at
          ? new Date(b.created_at).getFullYear()
          : null;
        if (batchYear !== filter.year) return false;
      }
      return true;
    });
  }, [batches, filter]);

  return (
    <div className="flex flex-col gap-4 p-8 bg-bg">
      <h1 className="font-semibold text-3xl">Commandes - {brand}</h1>
      <div className="flex gap-4">
        <SearchableSelect<number | null>
          name="order_number"
          value={filter.order_number}
          handleChange={handleOrderNumChange}
          placeholder="Ordre No"
          options={orderNumberOptions}
        />
        <SearchableSelect<number | null>
          name="year"
          value={filter.year}
          handleChange={handleYearChange}
          placeholder="Année"
          options={yearOptions}
        />
      </div>

      {loading && <p>Chargement des commandes...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && filteredBatches.length === 0 && (
        <p>Aucune commande ne correspond à ces filtres.</p>
      )}

      {!loading && !error && filteredBatches.length > 0 && (
        <div className="grid grid-cols-[repeat(3,minmax(280px,1fr))] gap-6">
          {filteredBatches.map((item) => {
            const status = toOrderStatus(item.status);
            return (
              <div key={item.id} className="relative">
                <DraftCard
                  code={status === OrderStatus.DRAFT ? null : item.code}
                  status={status}
                  orderDate={new Date(item.created_at)}
                  onExport={() =>
                    status === OrderStatus.DRAFT
                      ? setExportTarget(item)
                      : handleExport(item, null)
                  }
                  onCheckout={() => navigate(`/batches/${item.id}`)}
                  exporting={exportingId === item.id}
                />
                {status === OrderStatus.DRAFT && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    className="absolute right-3 top-3 rounded border border-red-300 bg-white px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                    aria-label="Supprimer ce brouillon"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {exportTarget && (
        <ExportModal
          onCancel={() => setExportTarget(null)}
          onConfirm={(customCode) => {
            const batch = exportTarget;
            setExportTarget(null);
            handleExport(batch, customCode);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          deleting={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}
    </div>
  );
}
