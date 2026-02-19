"use client";

import { Card } from "@/components/ui/Card";
import { useInvoices } from "@/hooks/useSubscription";

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusColor(status: string | null): string {
  switch (status) {
    case "paid":
      return "text-green-600 dark:text-green-400";
    case "open":
      return "text-yellow-600 dark:text-yellow-400";
    case "uncollectible":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-surface-500 dark:text-surface-400";
  }
}

export function InvoiceHistory() {
  const { invoices, isLoading } = useInvoices();

  if (isLoading) {
    return (
      <Card>
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-32 rounded bg-surface-200 dark:bg-surface-700" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded bg-surface-200 dark:bg-surface-700" />
          ))}
        </div>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
          Invoices
        </h3>
        <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
          No invoices yet.
        </p>
      </Card>
    );
  }

  return (
    <Card noPadding>
      <div className="p-4 pb-0">
        <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
          Invoices
        </h3>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-surface-200 dark:border-surface-700">
              <th className="px-4 py-2 font-medium text-surface-500 dark:text-surface-400">
                Date
              </th>
              <th className="px-4 py-2 font-medium text-surface-500 dark:text-surface-400">
                Number
              </th>
              <th className="px-4 py-2 font-medium text-surface-500 dark:text-surface-400">
                Amount
              </th>
              <th className="px-4 py-2 font-medium text-surface-500 dark:text-surface-400">
                Status
              </th>
              <th className="px-4 py-2 font-medium text-surface-500 dark:text-surface-400">
                PDF
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                className="border-b border-surface-100 last:border-0 dark:border-surface-800"
              >
                <td className="px-4 py-3 text-surface-700 dark:text-surface-300">
                  {formatDate(invoice.createdAt)}
                </td>
                <td className="px-4 py-3 text-surface-700 dark:text-surface-300">
                  {invoice.number || "-"}
                </td>
                <td className="px-4 py-3 text-surface-700 dark:text-surface-300">
                  {formatCurrency(invoice.amountPaid, invoice.currency)}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-medium capitalize ${statusColor(invoice.status)}`}>
                    {invoice.status || "unknown"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {invoice.invoicePdf ? (
                    <a
                      href={invoice.invoicePdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline dark:text-primary-400"
                    >
                      Download
                    </a>
                  ) : (
                    <span className="text-surface-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
