import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { ArrowLeft, Printer, Search, X } from "lucide-react";
import { SearchableSelect } from "../components/SearchableSelect";
import BatchPrintSheet from "../components/BatchPrintSheet";
import { formatOrderNumber } from "../components/DraftCard";
import LensComponentCard, {
  hasEye,
  type EyePrescription,
} from "../components/LensComponentCard";
import { getApiBase } from "../api";
import EditLensModal, { readApiError } from "../components/EditLensModal";
import ConfirmDialog from "../components/ConfirmDialog";

export interface Client {
  id: string;
  name: string;
  phone_number?: string | null;
}

export interface LensOrder {
  id: string;
  client?: Client | null;
  // At least one of the two eyes is always present.
  left_eye?: EyePrescription | null;
  right_eye?: EyePrescription | null;
  note?: string | null;
  arrived_at?: string | null;
}

export interface LensBrand {
  name: string;
}

export interface BatchContent {
  id: string;
  brand: LensBrand;
  code: number | null;
  status: string;
  created_at: string;
  lens_orders: LensOrder[];
}

type FilterKey = "ro" | "dia" | "sphere" | "cyl" | "axe";
type Filters = Record<FilterKey, number | null>;

const EMPTY_FILTERS: Filters = {
  ro: null,
  dia: null,
  sphere: null,
  cyl: null,
  axe: null,
};

const FILTER_FIELDS: {
  key: FilterKey;
  placeholder: string;
  allLabel: string;
}[] = [
  { key: "ro", placeholder: "Ro", allLabel: "-- Ro --" },
  { key: "dia", placeholder: "Dia", allLabel: "-- Dia --" },
  { key: "sphere", placeholder: "Sphère", allLabel: "-- Sphère --" },
  { key: "cyl", placeholder: "Cyl", allLabel: "-- Cyl --" },
  { key: "axe", placeholder: "Axe", allLabel: "-- Axe --" },
];

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const eyeMatches = (
  eye: EyePrescription | null | undefined,
  filter: Filters,
) => {
  if (!hasEye(eye)) return false;
  const e: EyePrescription = eye;
  return FILTER_FIELDS.every(
    ({ key }) => filter[key] === null || e[key] === filter[key],
  );
};

export default function BatchCheckout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [batch, setBatch] = useState<BatchContent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filters>(EMPTY_FILTERS);
  const [clientSearch, setClientSearch] = useState<string>("");

  const [editingOrder, setEditingOrder] = useState<LensOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<LensOrder | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: batch
      ? `${batch.brand.name}-${batch.code ?? "brouillon"}`
      : "commande",
  });

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${getApiBase()}/batches/${encodeURIComponent(id)}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          setError(
            `Batch Fetching Error: ${response.status} ${response.statusText}`,
          );
          return;
        }

        const data: BatchContent = await response.json();
        setBatch(data);
        setFilter(EMPTY_FILTERS);
        setClientSearch("");
        setError(null);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(
          e instanceof Error
            ? `Batch Fetching Error: ${e.message}`
            : `An unknown error occured : ${e}`,
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [getApiBase(), id]);

  const handleFilterChange = (name: string, value: number | null) => {
    const parsed = value === null ? null : Number(value);
    if (parsed !== null && Number.isNaN(parsed)) return;
    setFilter((prev) => ({ ...prev, [name as FilterKey]: parsed }));
  };

  // Local state update after a successful PATCH (no refetch).
  const handleLensSaved = (lensId: string, patch: Partial<LensOrder>) => {
    setBatch((prev) =>
      prev
        ? {
            ...prev,
            lens_orders: prev.lens_orders.map((o) =>
              o.id === lensId ? { ...o, ...patch } : o,
            ),
          }
        : prev,
    );
  };

  const closeDeleteDialog = () => {
    setDeletingOrder(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingOrder) return;
    const lensId = deletingOrder.id;

    try {
      setDeleteLoading(true);
      setDeleteError(null);
      const response = await fetch(
        `${getApiBase()}/lenses/${encodeURIComponent(lensId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        setDeleteError(await readApiError(response));
        return;
      }
      setBatch((prev) =>
        prev
          ? {
              ...prev,
              lens_orders: prev.lens_orders.filter((o) => o.id !== lensId),
            }
          : prev,
      );
      closeDeleteDialog();
    } catch (e) {
      setDeleteError(
        e instanceof Error
          ? `Suppression impossible : ${e.message}`
          : "Suppression impossible.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const filterOptions = useMemo(() => {
    const eyes = (batch?.lens_orders ?? []).flatMap((o) => [
      o.left_eye,
      o.right_eye,
    ]);

    const result = {} as Record<
      FilterKey,
      { label: string; value: number | null }[]
    >;

    for (const { key, allLabel } of FILTER_FIELDS) {
      const unique = Array.from(
        new Set(
          eyes
            .map((eye) => (hasEye(eye) ? eye[key] : undefined))
            .filter((v): v is number => v !== null && v !== undefined),
        ),
      ).sort((a, b) => a - b);

      result[key] = [
        { label: allLabel, value: null },
        ...unique.map((v) => ({ label: String(v), value: v })),
      ];
    }

    return result;
  }, [batch]);

  const filtersActive = Object.values(filter).some((v) => v !== null);
  const searchTokens = normalize(clientSearch).split(/\s+/).filter(Boolean);
  const searchActive = searchTokens.length > 0;
  const anyActive = filtersActive || searchActive;

  const filteredLensOrders = useMemo(() => {
    const tokens = normalize(clientSearch).split(/\s+/).filter(Boolean);

    return (batch?.lens_orders ?? []).filter((o) => {
      if (tokens.length > 0) {
        const name = normalize(o.client?.name ?? "");
        if (!tokens.every((t) => name.includes(t))) return false;
      }
      if (!filtersActive) return true;
      return eyeMatches(o.left_eye, filter) || eyeMatches(o.right_eye, filter);
    });
  }, [batch, filter, filtersActive, clientSearch]);

  const totalCount = batch?.lens_orders.length ?? 0;

  return (
    <div className="flex flex-col gap-4 bg-bg p-4 sm:p-8">
      {/* Client search */}
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5a5a]"
        />
        <input
          type="text"
          value={clientSearch}
          onChange={(e) => setClientSearch(e.target.value)}
          placeholder="Rechercher un client"
          aria-label="Rechercher un client"
          className="h-[38px] w-full rounded-xl border border-[#d2d2d2] bg-white pl-9 pr-9 text-sm outline-none placeholder:text-[#5a5a5a] focus:border-accent-2"
        />
        {clientSearch && (
          <button
            type="button"
            onClick={() => setClientSearch("")}
            aria-label="Effacer la recherche"
            className="absolute right-2 top-1/2 flex -translate-y-1/2 cursor-pointer items-center rounded-md p-1 text-[#5a5a5a] hover:bg-[#f3f3f3]"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex w-fit items-center gap-2 text-accent-2 hover:underline cursor-pointer"
      >
        <ArrowLeft size={16} />
        Commandes
      </button>

      {batch && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-semibold text-3xl">
              Checkout - {batch.brand.name}{" "}
              {batch.code !== null
                ? formatOrderNumber(batch.code, new Date(batch.created_at))
                : "(Draft)"}
            </h1>
            <p className="text-text/70">
              Date : {new Date(batch.created_at).toLocaleDateString("fr-FR")}
            </p>
          </div>

          <button
            type="button"
            onClick={() => handlePrint()}
            disabled={batch.lens_orders.length === 0}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#d2d2d2] bg-white px-4 py-2 text-sm hover:bg-[#f3f3f3] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer size={16} />
            Imprimer la commande
          </button>

          {/* Feuille A4 rendue hors écran, uniquement pour l'impression */}
          <div className="hidden">
            <BatchPrintSheet ref={printRef} batch={batch} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 gap-2 sm:gap-4">
        {FILTER_FIELDS.map(({ key, placeholder }) => (
          <SearchableSelect<number | null>
            key={key}
            name={key}
            value={filter[key]}
            handleChange={handleFilterChange}
            placeholder={placeholder}
            options={filterOptions[key]}
            compact
          />
        ))}
      </div>

      {loading && <p>Chargement de la commande...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && batch && (
        <>
          <p className="text-text/70">
            {anyActive
              ? `${filteredLensOrders.length} / ${totalCount} pairs`
              : `${totalCount} pairs`}
          </p>

          {totalCount === 0 && (
            <p>Cette commande ne contient aucune lentille.</p>
          )}

          {totalCount > 0 && filteredLensOrders.length === 0 && (
            <p>Aucune lentille ne correspond à cette recherche.</p>
          )}

          {filteredLensOrders.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
              {filteredLensOrders.map((order) => (
                <LensComponentCard
                  key={order.id}
                  clientName={order.client?.name}
                  left={order.left_eye}
                  right={order.right_eye}
                  note={order.note}
                  dimLeft={filtersActive && !eyeMatches(order.left_eye, filter)}
                  dimRight={
                    filtersActive && !eyeMatches(order.right_eye, filter)
                  }
                  onEdit={() => setEditingOrder(order)}
                  onDelete={() => setDeletingOrder(order)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {editingOrder && (
        <EditLensModal
          key={editingOrder.id}
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSaved={handleLensSaved}
        />
      )}

      {deletingOrder && (
        <ConfirmDialog
          title="Supprimer cette lentille ?"
          message={`${
            deletingOrder.client?.name
              ? `La lentille de ${deletingOrder.client.name}`
              : "Cette lentille"
          } sera définitivement supprimée de la commande. Cette action est irréversible.`}
          confirmLabel="Supprimer"
          loading={deleteLoading}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={closeDeleteDialog}
        />
      )}
    </div>
  );
}
