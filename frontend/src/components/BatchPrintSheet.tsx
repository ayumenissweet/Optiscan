import { forwardRef } from "react";
import type { BatchContent } from "../pages/BatchCheckout";
import type { EyePrescription } from "./LensComponentCard";

interface BatchPrintSheetProps {
  batch: BatchContent;
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

const formatCorrection = (eye: EyePrescription) => {
  const sphere = signed(eye.sphere);
  if (eye.cyl === null || eye.cyl === undefined || eye.cyl === 0) return sphere;
  const axe = eye.axe ?? 0;
  return `${sphere} (${signed(eye.cyl)} a ${axe})`;
};

const shortYear = (createdAt: string) => {
  const year = new Date(createdAt).getFullYear();
  return Number.isNaN(year) ? "" : String(year).slice(-2);
};

const EyeRow = ({ eye }: { eye?: EyePrescription }) => (
  <div className="grid grid-cols-[1fr_5rem_5rem] gap-4 text-lg leading-7">
    {eye ? (
      <>
        <span>{formatCorrection(eye)}</span>
        <span className="text-right tabular-nums">{eye.ro.toFixed(2)}</span>
        <span className="text-right tabular-nums">{eye.dia.toFixed(2)}</span>
      </>
    ) : (
      <span>—</span>
    )}
  </div>
);

export const BatchPrintSheet = forwardRef<HTMLDivElement, BatchPrintSheetProps>(
  ({ batch }, ref) => {
    const title = `${batch.brand}**${batch.code ?? ""}/${shortYear(
      batch.created_at,
    )}`;

    return (
      <div
        ref={ref}
        className="mx-auto box-border min-h-[297mm] w-[210mm] bg-white px-[18mm] py-[15mm] font-sans text-black"
      >
        <style>{`@page { size: A4; margin: 0; } @media print { body { -webkit-print-color-adjust: exact; } }`}</style>

        <h1 className="mb-10 text-center text-3xl font-bold">{title}</h1>

        <div className="space-y-8">
          {batch.lens_orders.map((order) => (
            <section key={order.id} className="break-inside-avoid">
              <h2 className="mb-1 text-xl font-semibold">
                {order.client?.name ?? "—"}
              </h2>
              <div className="pl-10">
                <EyeRow eye={order.right_eye} />
                <EyeRow eye={order.left_eye} />
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  },
);

BatchPrintSheet.displayName = "BatchPrintSheet";

export default BatchPrintSheet;
