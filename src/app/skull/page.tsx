import BackButton from "@/components/BackButton";
import TypewriterText from "@/components/TypewriterText";
import WindowPanel from "@/components/WindowPanel";

export default function SkullPage() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <WindowPanel>
        <p className="w-full text-left text-base sm:text-xl">
          <TypewriterText text="へんじがない。ただの しかばね のようだ。" />
        </p>
        <BackButton />
      </WindowPanel>
    </main>
  );
}
