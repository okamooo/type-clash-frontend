type WindowPanelProps = Readonly<{
  children: React.ReactNode;
}>;

export default function WindowPanel({ children }: WindowPanelProps) {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col items-center border-4 border-white bg-[#07133a] p-6 text-center sm:p-10">
      {children}
    </section>
  );
}
