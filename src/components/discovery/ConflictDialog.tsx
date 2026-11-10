import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Conflict } from "@/hooks/useAnswerSaver";

export function ConflictDialog({ conflict, onResolve }: { conflict: Conflict | null; onResolve: (c: "mine" | "theirs") => void }) {
  return (
    <Dialog open={!!conflict} onOpenChange={() => undefined}>
      <DialogContent className="max-w-3xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Someone else changed {conflict?.qid} while you were editing</DialogTitle>
          <DialogDescription>Choose which version to keep. Nothing is overwritten silently, and every previous revision stays recoverable in History.</DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border p-3"><div className="kicker mb-2">Their saved version (v{conflict?.theirs?.row_version ?? 0})</div>
            <p>State: {conflict?.theirs?.state ?? "—"}</p><pre className="mt-2 bg-secondary rounded p-2 whitespace-pre-wrap max-h-64 overflow-auto">{JSON.stringify(conflict?.theirs?.value, null, 1)}</pre></div>
          <div className="rounded-lg border p-3 border-teal"><div className="kicker mb-2">Your unsaved version</div>
            <p>State: {conflict?.mine.state}</p><pre className="mt-2 bg-secondary rounded p-2 whitespace-pre-wrap max-h-64 overflow-auto">{JSON.stringify(conflict?.mine.value, null, 1)}</pre></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onResolve("theirs")}>Keep theirs (discard mine)</Button>
          <Button onClick={() => onResolve("mine")}>Keep mine (save as new revision)</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
