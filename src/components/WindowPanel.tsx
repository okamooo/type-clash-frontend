type WindowPanelProps = Readonly<{
  children: React.ReactNode;
  as?: "div" | "nav" | "section";
  className?: string;
  variant?: "page" | "menu";
}>;

const classNameByVariant = {
  page: "mx-auto w-full max-w-4xl items-center p-6 text-center sm:p-10",
  menu: "items-stretch p-4 text-left",
} as const;

export default function WindowPanel({
  as: Component = "section",
  children,
  className = "",
  variant = "page",
}: WindowPanelProps) {
  return (
    <Component
      className={`flex flex-col border-4 border-white bg-[#07133a] ${classNameByVariant[variant]} ${className}`}
    >
      {children}
    </Component>
  );
}
