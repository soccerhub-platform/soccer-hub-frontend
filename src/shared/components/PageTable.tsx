import { Page } from "../types";
import {
  Button,
  Table,
  TableBody,
  TableHeader,
} from "../ui";

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
    <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white">
      <Table>
        <TableHeader>{renderHeader()}</TableHeader>
        <TableBody>{page.content.map(renderRow)}</TableBody>
      </Table>

      {!page.empty && (
        <div className="flex items-center justify-between border-t border-black/[0.08] bg-slate-50/60 px-4 py-3">
          <span className="text-xs text-slate-500">
            Страница {page.number + 1} из {page.totalPages}
          </span>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page.first}
              onClick={() => onPageChange(page.number - 1)}
            >
              Назад
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page.last}
              onClick={() => onPageChange(page.number + 1)}
            >
              Вперёд
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
