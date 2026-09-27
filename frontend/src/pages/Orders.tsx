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

export default function Orders({ brand }: OrdersProps) {
  const navigate = useNavigate();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
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

  const handleExport = async (batch: Batch) => {
    try {
      setExportingId(batch.id);
      const response = await fetch(`${getApiBase()}/export/${batch.id}`);

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
              <DraftCard
                key={item.id}
                code={status === OrderStatus.DRAFT ? null : item.code}
                status={status}
                orderDate={new Date(item.created_at)}
                onExport={() => handleExport(item)}
                onCheckout={() => navigate(`/batches/${item.id}`)}
                exporting={exportingId === item.id}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
