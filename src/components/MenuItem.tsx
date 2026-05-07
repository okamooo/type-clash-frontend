type MenuItemProps = Readonly<{
  children: React.ReactNode;
  showCursor?: boolean;
}>;

export default function MenuItem({
  children,
  showCursor = false,
}: MenuItemProps) {
  return (
    <div className="group inline-flex items-center justify-center gap-3 text-2xl transition-colors hover:text-yellow-200 sm:text-3xl">
      <span
        className="w-6 shrink-0 transition-transform group-hover:translate-x-1"
        aria-hidden="true"
      >
        {showCursor ? "▶" : ""}
      </span>
      <span>{children}</span>
    </div>
  );
}
