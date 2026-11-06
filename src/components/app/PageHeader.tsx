/** A workspace page's title (its one `<h1>`) and a line about what it is for. */
export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-2">
      <h1 className="font-newsreader text-[32px] leading-tight font-normal">{title}</h1>
      {description && <p className="text-[15px] text-pr-text-secondary">{description}</p>}
    </div>
  );
}
