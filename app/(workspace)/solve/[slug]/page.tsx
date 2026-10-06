import { SolveView } from "@/components/solve/solve-view";

export default async function SolvePage({ params }: PageProps<"/solve/[slug]">) {
  const { slug } = await params;
  return <SolveView slug={slug} />;
}
