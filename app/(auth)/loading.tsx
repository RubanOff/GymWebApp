import { Card, SkeletonCard } from "@/components/ui";

export default function AuthLoading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
      <div className="grid w-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <Card className="space-y-4 p-6">
          <SkeletonCard />
        </Card>
      </div>
    </main>
  );
}
