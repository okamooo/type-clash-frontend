import MenuItem from "@/components/MenuItem";

export default function TopPage() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center border-4 border-white bg-[#07133a] p-6 text-center sm:p-10">
        <h1 className="transform-[perspective(320px)_rotateX(12deg)_skewX(-8deg)_scaleY(1.08)] text-4xl font-bold drop-shadow-[4px_4px_0_#64748b] sm:text-6xl">
          Type-Clash
        </h1>
        <p className="mt-6 text-base sm:text-xl">
          リアルタイム対戦型タイピングアプリ
        </p>
        <div className="mt-10">
          <MenuItem selected>スタート</MenuItem>
        </div>
      </section>
    </main>
  );
}
