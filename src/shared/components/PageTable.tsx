import { Page } from "../types";

interface PageTableProps<T> {
  page: Page<T>;
  renderHeader: () => React.ReactNode;
  renderRow: (item: T) => React.ReactNode;
  onPageChange: (page: number) => void;
}

export function PageTable<T>({
  page,
  renderHeader,
  renderRow,
  onPageChange,
}: PageTableProps<T>) {
  return (
    <div className="bg-white shadow rounded-2xl border">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">{renderHeader()}</thead>
        <tbody className="divide-y divide-gray-200">
          {page.content.map(renderRow)}
        </tbody>
      </table>

      {!page.empty && (
        <div className="flex justify-between px-4 py-3 border-t bg-gray-50">
          <span className="text-xs text-gray-600">
            Страница {page.number + 1} из {page.totalPages}
          </span>

          <div className="flex gap-2">
            <button
              disabled={page.first}
              onClick={() => onPageChange(page.number - 1)}
              className="px-3 py-1 text-xs rounded border disabled:opacity-50"
            >
              Назад
            </button>
            <button
              disabled={page.last}
              onClick={() => onPageChange(page.number + 1)}
              className="px-3 py-1 text-xs rounded border disabled:opacity-50"
            >
              Вперёд
            </button>
          </div>
        </div>
      )}
    </div>
  );
}