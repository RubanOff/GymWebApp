import { Card, SkeletonCard } from "@/components/ui";

export default function ProtectedLoading() {
  return (
    <div className="space-y-4">
      <SkeletonCard />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <Card className="space-y-3 p-4">
        <SkeletonCard />
        <SkeletonCard />
      </Card>
    </div>
  );
}
