import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-center">
      <div className="font-mono text-sm text-primary">404</div>
      <h1 className="text-xl font-semibold">Not found</h1>
      <Button asChild variant="secondary"><Link href="/">Back to dashboard</Link></Button>
    </div>
  );
}
