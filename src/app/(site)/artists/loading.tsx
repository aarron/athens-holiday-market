import { Flower } from "@/components/brand";

export default function ArtistsLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading artists">
      <Flower size={48} color="var(--color-fuchsia)" spin />
    </div>
  );
}
