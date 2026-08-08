import { Flower } from "@/components/brand";

export default function AdminLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Loading">
      <Flower size={40} color="var(--color-fuchsia)" spin />
    </div>
  );
}
