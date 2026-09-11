import MediaPlayer from "@/components/MediaPlayer";

export const metadata = {
  title: "Sparx Media Embed",
  robots: "noindex",
};

/** Embeddable player for Sparx pages / iframe widgets */
export default function EmbedPage() {
  return (
    <div className="h-[100dvh] w-full">
      <MediaPlayer mode="embed" />
    </div>
  );
}
