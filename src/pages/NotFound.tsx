import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center p-8 text-center">
      <div>
        <p className="kicker">404</p>
        <h1 className="text-3xl font-bold mt-2">Page not found</h1>
        <Button asChild className="mt-6"><Link to="/">Back to portfolio</Link></Button>
      </div>
    </main>
  );
}
