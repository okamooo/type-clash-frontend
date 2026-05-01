type MenuItemProps = Readonly<{
  children: React.ReactNode;
  selected?: boolean;
}>;

export default function MenuItem({ children, selected = false }: MenuItemProps) {
  return (
    <div className="group inline-flex items-center justify-center gap-3 text-2xl transition-colors hover:text-yellow-200 sm:text-3xl">
      <span
        className="w-6 shrink-0 transition-transform group-hover:translate-x-1"
        aria-hidden="true"
      >
        {selected ? "▶" : ""}
      </span>
      <span>{children}</span>
    </div>
  );
}
