type MessagePanelProps = Readonly<{
  children: React.ReactNode;
  className?: string;
}>;

export default function MessagePanel({
  children,
  className = "",
}: MessagePanelProps) {
  return (
    <section
      className={`overflow-hidden whitespace-pre-line border-4 border-white bg-black p-8 text-left text-xl leading-loose shadow-[8px_8px_0_rgba(0,0,0,0.55)] sm:p-10 sm:text-2xl ${className}`}
    >
      {children}
    </section>
  );
}
