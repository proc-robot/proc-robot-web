/**
 * A workspace page's title (its one `<h1>`), a line about what it is for, and
 * optional actions on the right (e.g. "New project").
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-2">
        <h1 className="font-newsreader text-[32px] leading-tight font-normal break-words">
          {title}
        </h1>
        {description && <div className="text-[15px] text-pr-text-secondary">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
