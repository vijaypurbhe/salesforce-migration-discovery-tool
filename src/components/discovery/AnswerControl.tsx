import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AnswerValue, QuestionDefinition, SubField } from "@/domain/types";
import { COUNT_BANDS, OPTION_SETS } from "@/domain/questionBank";
import { shortId } from "@/lib/db";
import { cn } from "@/lib/utils";

interface Props { q: QuestionDefinition; value: AnswerValue; onChange: (v: AnswerValue) => void; disabled?: boolean }

export function validateValue(q: QuestionDefinition, v: AnswerValue): string | null {
  if (q.control === "single" && !v.selected) return "Choose an option.";
  if (q.control === "multi" && (!Array.isArray(v.selected) || v.selected.length === 0)) return "Choose at least one option.";
  const sel = Array.isArray(v.selected) ? v.selected : v.selected ? [v.selected] : [];
  if (sel.includes("other") && !v.other?.trim()) return "Describe “Other”.";
  if (q.noneExclusive && sel.some((s) => s.startsWith("none")) && sel.length > 1) return "“None” cannot be combined with other options.";
  if (q.control === "count") {
    const c = v.count;
    if (!c) return "Enter a count or choose a band.";
    if (c.mode === "exact" && (c.exact === null || c.exact === undefined || !Number.isInteger(c.exact) || c.exact < 0)) return "Count must be a whole number of zero or more.";
    if (c.mode !== "exact" && !c.band) return "Choose an estimate band.";
  }
  if (q.control === "number") {
    const bad = Object.values(v.metrics ?? {}).some((m) => m.value !== null && (Number.isNaN(m.value) || m.value < 0));
    if (bad) return "Values must be zero or more.";
    if (!Object.values(v.metrics ?? {}).some((m) => m.value !== null)) return "Enter at least one value.";
  }
  if ((q.control === "dateRange" || q.control === "date") && !v.start) return "Choose a date.";
  if (q.control === "dateRange" && v.end && v.start && v.end < v.start) return "End date must be after start date.";
  if ((q.control === "repeatable" || q.control === "table") && !(v.items?.length)) return "Add at least one entry.";
  if (q.control === "text" && !v.text?.trim() && !Object.values(v.details ?? {}).some((x) => x?.trim())) return "Enter a response.";
  return null;
}

function SearchableSingle({ q, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const cur = q.options.find((o) => o.value === value.selected);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} aria-label={q.label} disabled={disabled} className="w-full max-w-md justify-between font-normal">
          {cur?.label ?? "Select…"}<ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
        <Command><CommandInput placeholder="Search options…" /><CommandList><CommandEmpty>No match.</CommandEmpty><CommandGroup>
          {q.options.map((o) => (
            <CommandItem key={o.value} onSelect={() => { onChange({ ...value, selected: o.value }); setOpen(false); }}>
              <Check className={cn("h-4 w-4 mr-2", value.selected === o.value ? "opacity-100" : "opacity-0")} />{o.label}
            </CommandItem>
          ))}
        </CommandGroup></CommandList></Command>
      </PopoverContent>
    </Popover>
  );
}

function MultiChips({ q, value, onChange, disabled }: Props) {
  const [filter, setFilter] = useState("");
  const sel = (Array.isArray(value.selected) ? value.selected : []) as string[];
  const toggle = (v: string) => {
    const isNone = v.startsWith("none");
    let next = sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v];
    if (q.noneExclusive && !sel.includes(v)) next = isNone ? [v] : next.filter((x) => !x.startsWith("none"));
    const ranks = (value.ranks ?? []).filter((r) => next.includes(r));
    onChange({ ...value, selected: next, ranks });
  };
  const opts = q.options.filter((o) => o.label.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="space-y-2">
      {q.options.length > 8 && <Input aria-label="Filter options" placeholder="Filter options…" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs h-8" />}
      <div role="group" aria-label={q.label} className="flex flex-wrap gap-2">
        {opts.map((o) => {
          const on = sel.includes(o.value);
          return (
            <button key={o.value} type="button" disabled={disabled} aria-pressed={on} onClick={() => toggle(o.value)}
              className={cn("rounded-full border px-3 py-1.5 text-sm transition-colors", on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary")}>
              {on && <Check className="inline h-3.5 w-3.5 mr-1 -mt-0.5" aria-hidden />}{o.label}
            </button>
          );
        })}
        {!q.options.some((o) => o.value === "other") && (
          <button type="button" disabled={disabled} aria-pressed={sel.includes("other")} onClick={() => toggle("other")} className={cn("rounded-full border border-dashed px-3 py-1.5 text-sm", sel.includes("other") ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary")}>Other…</button>
        )}
      </div>
      {q.rank && sel.length > 0 && <RankList value={value} onChange={onChange} q={q} disabled={disabled} />}
      {q.perOption && sel.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-2 pt-1">
          {sel.filter((s) => s !== "other").map((s) => (
            <div key={s} className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-1.5">
              <span className="text-sm flex-1 truncate">{q.options.find((o) => o.value === s)?.label ?? s}</span>
              <Select disabled={disabled} value={value.perOption?.[s] ?? ""} onValueChange={(v) => onChange({ ...value, perOption: { ...(value.perOption ?? {}), [s]: v } })}>
                <SelectTrigger className="h-8 w-48 bg-background" aria-label={`${q.perOption!.label} for ${s}`}><SelectValue placeholder={q.perOption!.label} /></SelectTrigger>
                <SelectContent>{q.perOption!.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RankList({ q, value, onChange, disabled }: Props) {
  const sel = (value.selected as string[]) ?? [];
  const ranks = value.ranks?.length ? value.ranks : [];
  const add = (v: string) => ranks.length < 3 && onChange({ ...value, ranks: [...ranks, v] });
  const move = (i: number, d: number) => { const r = [...ranks]; const j = i + d; if (j < 0 || j >= r.length) return; [r[i], r[j]] = [r[j], r[i]]; onChange({ ...value, ranks: r }); };
  return (
    <div className="rounded-lg border p-3 text-sm">
      <div className="kicker mb-2">Rank top three</div>
      <ol className="space-y-1">
        {ranks.map((r, i) => (
          <li key={r} className="flex items-center gap-2"><span className="w-5 font-bold">{i + 1}.</span><span className="flex-1">{q.options.find((o) => o.value === r)?.label ?? r}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={disabled} aria-label="Move up" onClick={() => move(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={disabled} aria-label="Move down" onClick={() => move(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={disabled} aria-label="Remove from ranking" onClick={() => onChange({ ...value, ranks: ranks.filter((x) => x !== r) })}><Trash2 className="h-3.5 w-3.5" /></Button>
          </li>
        ))}
      </ol>
      {ranks.length < 3 && <div className="flex flex-wrap gap-1 mt-2">{sel.filter((s) => !ranks.includes(s)).map((s) => <Button key={s} size="sm" variant="outline" className="h-7" disabled={disabled} onClick={() => add(s)}>+ {q.options.find((o) => o.value === s)?.label ?? s}</Button>)}</div>}
    </div>
  );
}

function RadioCards({ q, value, onChange, disabled }: Props) {
  return (
    <div role="radiogroup" aria-label={q.label} className="grid sm:grid-cols-2 gap-2 max-w-2xl">
      {q.options.map((o) => {
        const on = value.selected === o.value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => onChange({ ...value, selected: o.value })}
            className={cn("text-left rounded-lg border p-3 text-sm transition-colors", on ? "border-teal bg-teal-soft ring-1 ring-teal" : "hover:bg-secondary")}>
            <span className={cn("inline-block h-3.5 w-3.5 rounded-full border mr-2 align-[-2px]", on && "border-4 border-teal")} aria-hidden />{o.label}
          </button>
        );
      })}
    </div>
  );
}

function CountInput({ value, onChange, disabled }: Props) {
  const c = value.count ?? { mode: "exact" as const, exact: null };
  const set = (patch: Partial<typeof c>) => onChange({ ...value, count: { ...c, ...patch } as AnswerValue["count"] });
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <Label className="text-xs">Precision</Label>
        <Select disabled={disabled} value={c.mode} onValueChange={(m) => set({ mode: m as "exact" | "estimate" | "band" })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="exact">Exact count</SelectItem><SelectItem value="estimate">Estimated band</SelectItem><SelectItem value="band">Band (range known)</SelectItem></SelectContent>
        </Select>
      </div>
      {c.mode === "exact" ? (
        <div><Label className="text-xs" htmlFor="cnt">Count</Label><Input id="cnt" disabled={disabled} type="number" min={0} step={1} inputMode="numeric" className="w-40"
          value={c.exact ?? ""} onChange={(e) => set({ exact: e.target.value === "" ? null : Number(e.target.value) })} /></div>
      ) : (
        <div>
          <Label className="text-xs">Band</Label>
          <Select disabled={disabled} value={c.band ?? ""} onValueChange={(b) => set({ band: b, min: COUNT_BANDS[b].min, max: COUNT_BANDS[b].max })}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Choose band" /></SelectTrigger>
            <SelectContent>{OPTION_SETS.COUNT.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      {c.mode !== "exact" && c.band && <p className="text-xs text-muted-foreground pb-2">Stored as min {c.min ?? "—"} / max {c.max ?? "open"} — never as an exact count.</p>}
    </div>
  );
}

function Metrics({ q, value, onChange, disabled }: Props) {
  const m = value.metrics ?? {};
  return (
    <div className="grid sm:grid-cols-2 gap-3 max-w-3xl">
      {q.subfields.map((s) => {
        const cur = m[s.key] ?? { value: null, status: "exact" as const };
        const set = (p: Partial<typeof cur>) => onChange({ ...value, metrics: { ...m, [s.key]: { ...cur, ...p } } });
        return (
          <div key={s.key} className="rounded-lg border p-2.5">
            <Label className="text-xs" htmlFor={`m-${s.key}`}>{s.label}</Label>
            <div className="flex gap-2 mt-1">
              <Input id={`m-${s.key}`} disabled={disabled} type="number" min={0} value={cur.value ?? ""} onChange={(e) => set({ value: e.target.value === "" ? null : Number(e.target.value) })} />
              <Select disabled={disabled} value={cur.status} onValueChange={(v) => set({ status: v as "exact" | "estimated" })}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="exact">Measured</SelectItem><SelectItem value="estimated">Estimated</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FieldInput({ f, val, set, disabled, id }: { f: SubField; val: string; set: (v: string) => void; disabled?: boolean; id: string }) {
  if (f.type === "select" && f.options) return (
    <Select disabled={disabled} value={val || ""} onValueChange={set}>
      <SelectTrigger id={id}><SelectValue placeholder="Select" /></SelectTrigger>
      <SelectContent>{f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  );
  return <Input id={id} disabled={disabled} type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} min={f.type === "number" ? 0 : undefined} value={val ?? ""} onChange={(e) => set(e.target.value)} />;
}

function Repeatable({ q, value, onChange, disabled }: Props) {
  const items = value.items ?? [];
  const fields = q.subfields.length ? q.subfields : [{ key: "description", label: "Description" }];
  const update = (id: string, k: string, v: string) => onChange({ ...value, items: items.map((i) => (i.id === id ? { ...i, fields: { ...i.fields, [k]: v } } : i)) });
  return (
    <div className="space-y-3">
      {items.map((it, idx) => (
        <div key={it.id} className="rounded-lg border p-3 bg-secondary/30">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-muted-foreground">Entry {idx + 1} · <span className="font-mono">{it.id}</span></span>
            <Button size="sm" variant="ghost" disabled={disabled} onClick={() => onChange({ ...value, items: items.filter((x) => x.id !== it.id) })} aria-label={`Remove entry ${idx + 1}`}><Trash2 className="h-4 w-4" /></Button></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {fields.map((f) => (
              <div key={f.key}><Label className="text-xs" htmlFor={`${it.id}-${f.key}`}>{f.label}</Label>
                <FieldInput id={`${it.id}-${f.key}`} f={f} val={it.fields[f.key] ?? ""} set={(v) => update(it.id, f.key, v)} disabled={disabled} /></div>
            ))}
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" disabled={disabled} onClick={() => onChange({ ...value, items: [...items, { id: shortId(), fields: {} }] })}><Plus className="h-4 w-4 mr-1" />Add entry</Button>
    </div>
  );
}

function TableGrid({ q, value, onChange, disabled }: Props) {
  const cols = ["source_object", "source_field", "datatype", "target_object_candidate", "target_field_candidate", "transform", "default", "lookup_key", "validation", "disposition"];
  const items = value.items ?? [];
  const [paste, setPaste] = useState("");
  const importPaste = () => {
    const rows = paste.trim().split(/\r?\n/).filter(Boolean).map((line) => {
      const cells = line.split("\t");
      return { id: shortId(), fields: Object.fromEntries(cols.map((c, i) => [c, (cells[i] ?? "").trim()])) };
    });
    onChange({ ...value, items: [...items, ...rows] }); setPaste("");
  };
  const upd = (id: string, c: string, v: string) => onChange({ ...value, items: items.map((i) => (i.id === id ? { ...i, fields: { ...i.fields, [c]: v } } : i)) });
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border max-h-[420px]">
        <table className="text-xs min-w-[1100px] w-full">
          <thead className="bg-secondary sticky top-0"><tr>{cols.map((c) => <th key={c} className="p-2 text-left font-semibold">{c.replace(/_/g, " ")}</th>)}<th className="p-2"><span className="sr-only">Remove</span></th></tr></thead>
          <tbody>{items.map((it) => (
            <tr key={it.id} className="border-t">{cols.map((c) => <td key={c} className="p-1"><Input aria-label={`${c} row ${it.id}`} disabled={disabled} className="h-7 text-xs" value={it.fields[c] ?? ""} onChange={(e) => upd(it.id, c, e.target.value)} /></td>)}
              <td className="p-1"><Button size="icon" variant="ghost" className="h-7 w-7" disabled={disabled} aria-label="Remove row" onClick={() => onChange({ ...value, items: items.filter((x) => x.id !== it.id) })}><Trash2 className="h-3.5 w-3.5" /></Button></td></tr>
          ))}</tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Target API names are hypotheses until an architect validates them against the chosen release.</p>
      <div className="flex gap-2 items-start">
        <Textarea disabled={disabled} aria-label="Paste rows from a spreadsheet" placeholder={`Paste rows from a spreadsheet (tab-separated, columns: ${cols.join(", ")})`} value={paste} onChange={(e) => setPaste(e.target.value)} className="text-xs h-16" />
        <div className="flex flex-col gap-1">
          <Button size="sm" variant="outline" disabled={disabled || !paste.trim()} onClick={importPaste}>Add pasted rows</Button>
          <Button size="sm" variant="outline" disabled={disabled} onClick={() => onChange({ ...value, items: [...items, { id: shortId(), fields: {} }] })}><Plus className="h-4 w-4 mr-1" />Row</Button>
        </div>
      </div>
    </div>
  );
}

function DateRange({ q, value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div><Label className="text-xs" htmlFor="ds">Start / deadline</Label><Input id="ds" type="date" disabled={disabled} value={value.start ?? ""} onChange={(e) => onChange({ ...value, start: e.target.value })} /></div>
      {q.control === "dateRange" && <div><Label className="text-xs" htmlFor="de">End (optional)</Label><Input id="de" type="date" disabled={disabled} value={value.end ?? ""} onChange={(e) => onChange({ ...value, end: e.target.value })} /></div>}
      {q.options.length > 0 && (
        <div><Label className="text-xs">Reason</Label>
          <Select disabled={disabled} value={value.reason ?? ""} onValueChange={(v) => onChange({ ...value, reason: v })}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Reason" /></SelectTrigger>
            <SelectContent>{q.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select></div>
      )}
    </div>
  );
}

export function AnswerControl(props: Props) {
  const { q, value, onChange, disabled } = props;
  const sel = useMemo(() => (Array.isArray(value.selected) ? value.selected : value.selected ? [value.selected] : []), [value.selected]);
  let main: JSX.Element | null = null;
  switch (q.control) {
    case "single": main = q.options.length <= 4 ? <RadioCards {...props} /> : <SearchableSingle {...props} />; break;
    case "multi": main = <MultiChips {...props} />; break;
    case "count": main = <CountInput {...props} />; break;
    case "number": main = <Metrics {...props} />; break;
    case "date": case "dateRange": main = <DateRange {...props} />; break;
    case "repeatable": main = <Repeatable {...props} />; break;
    case "table": main = <TableGrid {...props} />; break;
    case "text": main = <Textarea aria-label={q.label} disabled={disabled} value={value.text ?? ""} onChange={(e) => onChange({ ...value, text: e.target.value })} placeholder="Summarise the answer; use the structured fields below for specifics." />; break;
  }
  const showDetails = !["repeatable", "number", "table"].includes(q.control) && q.subfields.length > 0;
  return (
    <div className="space-y-4">
      {main}
      {sel.includes("other") && (
        <div className="max-w-md"><Label htmlFor={`${q.id}-other`} className="text-xs">“Other” label (required)</Label>
          <Input id={`${q.id}-other`} disabled={disabled} value={value.other ?? ""} onChange={(e) => onChange({ ...value, other: e.target.value })} /></div>
      )}
      {showDetails && (
        <details className="rounded-lg border p-3 group" open={Object.values(value.details ?? {}).some(Boolean)}>
          <summary className="text-sm font-medium cursor-pointer">Structured details <span className="text-muted-foreground font-normal">(optional — {q.subfields.length} fields)</span></summary>
          <div className="grid sm:grid-cols-2 gap-2 mt-3">
            {q.subfields.map((f) => (
              <div key={f.key}><Label className="text-xs" htmlFor={`${q.id}-d-${f.key}`}>{f.label}</Label>
                <FieldInput id={`${q.id}-d-${f.key}`} f={f} val={value.details?.[f.key] ?? ""} set={(v) => onChange({ ...value, details: { ...(value.details ?? {}), [f.key]: v } })} disabled={disabled} /></div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
