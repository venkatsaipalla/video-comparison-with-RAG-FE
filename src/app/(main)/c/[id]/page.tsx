"use client";

import { useParams } from "next/navigation";
import { ComparisonView } from "@/components/ComparisonView";

export default function ComparisonPage() {
  const params = useParams();
  const comparisonId = params.id as string;

  // Remount on id change so stale video/chat state cannot leak between history items.
  return <ComparisonView key={comparisonId} comparisonId={comparisonId} />;
}
