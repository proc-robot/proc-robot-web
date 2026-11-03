import { cn } from "@/lib/utils";

/** Page content column for the public site: 1200px max, padded on small screens. */
export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1200px] px-5 lg:px-8", className)}>
      {children}
    </div>
  );
}
