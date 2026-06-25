"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/console");
  }, [router]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
      <p className="text-ink-muted text-sm">Opening the Action Queue…</p>
    </div>
  );
}
