import { ClipboardCheck, Download } from "lucide-react";

export enum OrderStatus {
  DRAFT = "Draft",
  SENT = "Sent",
  RECEIVED = "Received",
}

interface DraftCardProps {
  code: number | null;
  orderDate: Date;
  status: OrderStatus;
  onExport?: () => void;
  onCheckout?: () => void;
  exporting?: boolean;
}

export function formatOrderNumber(code: number, date: Date) {
  return `#${code}/${date.getFullYear() % 100}`;
}

const STATUS_STYLES = {
  [OrderStatus.DRAFT]: {
    label: "Draft",
    badgeClass: "bg-accent-2 text-bg",
  },
  [OrderStatus.SENT]: {
    label: "Envoyée",
    badgeClass: "bg-accent-2/20 text-accent-2",
  },
  [OrderStatus.RECEIVED]: {
    label: "Reçue",
    badgeClass: "text-text/80",
  },
};

export default function DraftCard({
  code,
  orderDate,
  status,
  onExport,
  onCheckout,
  exporting = false,
}: DraftCardProps) {
  const { label, badgeClass } = STATUS_STYLES[status];
  const orderNumber = code !== null ? formatOrderNumber(code, orderDate) : null;

  return (
    <div className="bg-card p-2 flex flex-col items-center justify-between gap-4 border-[1.5px] border-stroke min-h-52 h-full w-full rounded-lg">
      <p
        className={`text-[20px] w-fit whitespace-nowrap p-1.5 rounded-md ${badgeClass}`}
      >
        <span className="font-semibold">{label}</span>
        {orderNumber && ` ${orderNumber}`}
      </p>

      <div className="w-full">
        <p>Date : {orderDate.toLocaleDateString("fr-FR")}</p>
      </div>

      <div className="flex flex-col gap-2 w-full">
        {onCheckout && (
          <button
            type="button"
            onClick={onCheckout}
            className="flex gap-2 items-center justify-center font-semibold w-full border-[1.5px] border-accent-2 text-accent-2 hover:bg-accent-2/10 transition-colors py-2 rounded-md cursor-pointer"
          >
            Checkout
            <ClipboardCheck size={16} />
          </button>
        )}

        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="flex text-bg gap-2 items-center justify-center font-semibold w-full bg-accent-2 hover:bg-accent-2/90 transition-colors py-2 rounded-md disabled:opacity-50 cursor-pointer"
        >
          {exporting ? "Export en cours..." : "Export"}
          <Download size={16} />
        </button>
      </div>
    </div>
  );
}
