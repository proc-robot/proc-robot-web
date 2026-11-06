/**
 * A project tab whose feature is not built yet: what it will hold and which
 * TASKS.md ids build it. Replace the tab's body when the feature ships.
 */
export function ProjectStage({
  title,
  description,
  tasks,
}: {
  title: string;
  description: string;
  tasks: string[];
}) {
  return (
    <section
      aria-labelledby="stage-heading"
      className="rounded-[14px] border border-dashed border-pr-border-dashed bg-white p-6"
    >
      <h2 id="stage-heading" className="text-base font-semibold">
        {title}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-pr-text-secondary">{description}</p>
      <p className="mt-4 text-xs font-semibold tracking-[0.1em] text-pr-text-tertiary uppercase">
        Not built yet
      </p>
      <p className="mt-1 text-sm">
        Built by{" "}
        {tasks.map((task, index) => (
          <span key={task}>
            {index > 0 && ", "}
            <code className="rounded bg-pr-neutral-chip px-1.5 py-0.5 font-mono text-xs">
              {task}
            </code>
          </span>
        ))}{" "}
        in <code className="font-mono text-xs">TASKS.md</code>.
      </p>
    </section>
  );
}
