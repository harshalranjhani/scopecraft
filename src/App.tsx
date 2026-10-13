import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Leaf,
  LoaderCircle,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  CircleAlert,
  CheckCircle2,
  ExternalLink,
  Upload,
  PanelLeftClose,
  Wallet,
  SlidersHorizontal,
} from "lucide-react";
import {
  briefSchema,
  backupSchema,
  scopeSchema,
  proposalSchema,
  money,
  quote,
  proposalMarkdown,
  type Brief,
  type Proposal,
  type Settings,
} from "./domain";
import { exampleBriefs, examples, recordedExample } from "./examples";
import { downloadFile, loadWorkspace, saveWorkspace } from "./storage";

type Health = {
  available: boolean;
  model: string;
  tokenRequired: boolean;
  busy: boolean;
};
type Page = "overview" | "proposals" | "settings";
const statuses = {
  draft: "Draft",
  ready: "Ready to share",
  accepted: "Accepted",
};
function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}
function date(value: string) {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
function filename(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "proposal"
  );
}

function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function ClientDocument({ p, settings }: { p: Proposal; settings: Settings }) {
  const q = quote(p);
  return (
    <article className="client-document">
      <div className="document-top">
        <span>{settings.studio || settings.name}</span>
        <span>PROJECT PROPOSAL</span>
      </div>
      <h1>{p.projectName}</h1>
      <p className="document-for">
        Prepared for {p.clientName} · {date(p.createdAt)}
      </p>
      <h2>The project</h2>
      <p>{p.scope.summary}</p>
      <h2>What we’ll deliver</h2>
      {p.scope.deliverables.map((d, i) => (
        <div className="document-deliverable" key={i}>
          <strong>
            {String(i + 1).padStart(2, "0")} / {d.title}
          </strong>
          <p>{d.description}</p>
          <span>
            {d.hours} estimated hours ·{" "}
            {money(
              Math.round(d.hours * Math.round(p.hourlyRate * 100)),
              p.currency,
            )}
          </span>
        </div>
      ))}
      <div className="document-investment">
        <h2>Your investment</h2>
        <div>
          <span>Base estimate</span>
          <span>{money(q.subtotal, p.currency)}</span>
        </div>
        <div>
          <span>Contingency · {p.bufferPercent}%</span>
          <span>{money(q.buffer, p.currency)}</span>
        </div>
        <div className="document-total">
          <strong>Project total</strong>
          <strong>{money(q.total, p.currency)}</strong>
        </div>
        <p>
          Proposed 50% deposit: {money(q.deposit, p.currency)}. Dates and
          payment terms to be agreed before starting.
        </p>
      </div>
      <h2>Outside this scope</h2>
      <ul>
        {p.scope.exclusions.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
      <h2>Before we begin</h2>
      <ul>
        {p.scope.questions.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
      <h2>Working together</h2>
      <p>
        This estimate is subject to confirmation of the scope and open
        questions. Additional work requires a separate estimate and approval.
        Dates will be agreed after scope confirmation.
      </p>
      <footer>
        {settings.name}
        {settings.email && ` · ${settings.email}`}
        <span>Prepared with ScopeCraft</span>
      </footer>
    </article>
  );
}

export default function App() {
  const [initial] = useState(loadWorkspace);
  const [proposals, setProposals] = useState(initial.proposals);
  const [settings, setSettings] = useState(initial.settings);
  const [storageError, setStorageError] = useState(initial.warning);
  const [page, setPage] = useState<Page>("overview");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<
    "new" | "about" | "export" | "delete" | null
  >(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [health, setHealth] = useState<Health | null>(null);
  const [token, setToken] = useState("");
  const [toast, setToast] = useState("");
  const [draft, setDraft] = useState<Brief>(() => {
    try {
      return briefSchema.parse(
        JSON.parse(sessionStorage.getItem("scopecraft.brief") ?? ""),
      );
    } catch {
      return {
        clientName: "",
        projectName: "",
        brief: "",
        hourlyRate: settings.hourlyRate,
        currency: settings.currency,
        bufferPercent: settings.bufferPercent,
      };
    }
  });
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [tab, setTab] = useState<"scope" | "risks" | "preview">("scope");
  const cancelGeneration = useRef<AbortController | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const selected = proposals.find((p) => p.id === selectedId);

  function notify(message: string) {
    setToast(message);
  }
  async function refreshHealth() {
    if (import.meta.env.VITE_STATIC_DEMO === "true") {
      setHealth({
        available: false,
        model: "qwen3-0.6b",
        tokenRequired: false,
        busy: false,
      });
      return;
    }
    try {
      const res = await fetch("./api/health");
      if (!res.ok) throw new Error();
      setHealth(await res.json());
    } catch {
      setHealth({
        available: false,
        model: "qwen3-0.6b",
        tokenRequired: false,
        busy: false,
      });
    }
  }
  useEffect(() => {
    void refreshHealth();
  }, []);
  useEffect(() => {
    if (initial.warning) return;
    try {
      saveWorkspace(proposals, settings);
      setStorageError("");
    } catch {
      setStorageError(
        "Browser storage is full or unavailable. Export a backup to keep your changes.",
      );
    }
  }, [proposals, settings, initial.warning]);
  useEffect(() => {
    try {
      sessionStorage.setItem("scopecraft.brief", JSON.stringify(draft));
    } catch {
      /* In-memory draft remains usable when storage is unavailable. */
    }
  }, [draft]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!generating) return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [generating]);

  function navigate(next: Page) {
    setPage(next);
    setSelectedId(null);
    setMobileMenu(false);
    setSearch("");
    setFilter("all");
  }
  function openProposal(p: Proposal) {
    setSelectedId(p.id);
    setTab("scope");
    setPage("proposals");
  }
  function updateProposal(change: Partial<Proposal>) {
    setProposals((list) =>
      list.map((p) => (p.id === selectedId ? { ...p, ...change } : p)),
    );
  }
  function newProposal() {
    if (proposals.length >= 200) {
      notify(
        "This workspace holds up to 200 proposals. Export a backup and remove old proposals before adding another.",
      );
      return;
    }
    if (!draft.brief)
      setDraft({
        ...draft,
        hourlyRate: settings.hourlyRate,
        currency: settings.currency,
        bufferPercent: settings.bufferPercent,
      });
    setGenerationError("");
    setModal("new");
    setMobileMenu(false);
    void refreshHealth();
  }
  function loadExample(index: number) {
    const p: Proposal = {
      ...structuredClone(index === -1 ? recordedExample : examples[index]),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setProposals((list) => [p, ...list]);
    openProposal(p);
    setModal(null);
    notify("Example added. Make it your own.");
  }
  async function generate(event: FormEvent) {
    event.preventDefault();
    setGenerationError("");
    const parsed = briefSchema.safeParse(draft);
    if (!parsed.success) {
      setGenerationError(parsed.error.issues[0].message);
      return;
    }
    setGenerating(true);
    setElapsed(0);
    const controller = new AbortController();
    cancelGeneration.current = controller;
    try {
      const response = await fetch("./api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(parsed.data),
        signal: controller.signal,
      });
      if (
        response.headers.get("content-type")?.includes("application/json") !==
        true
      )
        throw new Error(
          "This hosted demo has no model server. Use an example here, or run ScopeCraft locally for private AI generation.",
        );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "Generation failed. Your brief is preserved.",
        );
      const p: Proposal = proposalSchema.parse({
        ...parsed.data,
        scope: result.scope,
        model: result.model,
        generationMs: result.generationMs,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        status: "draft",
        source: "local-ai",
      });
      setProposals((list) => [p, ...list]);
      openProposal(p);
      setModal(null);
      notify("Your first draft is ready. Review the scope and hours.");
    } catch (error) {
      setGenerationError(
        error instanceof Error && error.name === "AbortError"
          ? "Generation cancelled. Your brief is still here."
          : error instanceof Error
            ? error.message
            : "Generation failed. Try again.",
      );
    } finally {
      setGenerating(false);
      cancelGeneration.current = null;
      void refreshHealth();
    }
  }
  function backup() {
    downloadFile(
      "scopecraft-backup.json",
      JSON.stringify({ version: 1, proposals, settings }, null, 2),
      "application/json",
    );
    notify("Workspace backup downloaded.");
  }
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > 4000000)
        throw new Error("Choose a backup smaller than 4 MB.");
      const data = backupSchema.parse(JSON.parse(await file.text()));
      const existing = new Set(proposals.map((p) => p.id));
      const added = data.proposals.filter((p) => !existing.has(p.id));
      if (proposals.length + added.length > 200)
        throw new Error("A workspace can hold up to 200 proposals.");
      setProposals((list) => [...added, ...list]);
      notify(
        `Imported ${added.length} proposals. Existing work and profile are preserved.`,
      );
    } catch (error) {
      notify(
        error instanceof Error && error.message.startsWith("Choose")
          ? error.message
          : "This file is not a valid ScopeCraft backup. Your workspace is unchanged.",
      );
    }
    if (importInput.current) importInput.current.value = "";
  }
  const visible = proposals.filter(
    (p) =>
      (filter === "all" || p.status === filter) &&
      `${p.projectName} ${p.clientName}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const priced = proposals.filter((p) => p.currency === settings.currency);
  const total = priced.reduce((sum, p) => sum + quote(p).total, 0);
  const pendingQuestions = proposals
    .filter((p) => p.status === "draft")
    .reduce((sum, p) => sum + p.scope.questions.length, 0);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="app-shell">
        {mobileMenu && (
          <button
            className="menu-scrim"
            aria-label="Close navigation"
            onClick={() => setMobileMenu(false)}
          />
        )}
        <aside
          className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}
          aria-label="Workspace navigation"
        >
          <button className="brand" onClick={() => navigate("overview")}>
            <img src="./favicon.svg" alt="" />
            <span>
              ScopeCraft<span className="brand-dot">.</span>
            </span>
          </button>
          <div className="workspace-switch">
            <span className="workspace-icon">Y</span>
            <div>
              <strong>Personal workspace</strong>
              <span>Independent & in control</span>
            </div>
            <LockKeyhole size={14} />
          </div>
          <span className="nav-label">WORKSPACE</span>
          <nav aria-label="Main navigation">
            <button
              className={page === "overview" ? "nav-active" : ""}
              onClick={() => navigate("overview")}
            >
              <LayoutDashboard size={19} />
              Overview
            </button>
            <button
              className={page === "proposals" ? "nav-active" : ""}
              onClick={() => navigate("proposals")}
            >
              <FolderOpen size={19} />
              Proposals<span className="nav-count">{proposals.length}</span>
            </button>
            <button
              className={page === "settings" ? "nav-active" : ""}
              onClick={() => navigate("settings")}
            >
              <Settings2 size={19} />
              Workspace settings
            </button>
          </nav>
          <div className="sidebar-bottom">
            <div className="privacy-note">
              <div className="privacy-symbol">
                <Leaf size={22} />
              </div>
              <strong>Your work. Your machine.</strong>
              <p>
                Open models. Private briefs.
                <br />A little more peace of mind.
              </p>
              <button onClick={() => setModal("about")}>
                Meet ScopeCraft <ArrowUpRight size={14} />
              </button>
            </div>
            <button className="sidebar-help" onClick={() => setModal("about")}>
              <CircleHelp size={17} /> A little help, if you need it
            </button>
            <div className="user-card">
              <span className="avatar">{initials(settings.name) || "Y"}</span>
              <div>
                <strong>{settings.name || "Your workspace"}</strong>
                <span>Independent workspace</span>
              </div>
              <button
                className="icon-button"
                aria-label="Open workspace settings"
                onClick={() => navigate("settings")}
              >
                <SlidersHorizontal size={17} />
              </button>
            </div>
          </div>
        </aside>

        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="mobile-toggle icon-button"
                aria-label="Open navigation"
                onClick={() => setMobileMenu(true)}
              >
                <Menu size={22} />
              </button>
              <span>Workspace</span>
              <ChevronRight size={14} />
              <strong>
                {selected
                  ? "Proposal editor"
                  : page === "overview"
                    ? "Overview"
                    : page === "proposals"
                      ? "Proposals"
                      : "Settings"}
              </strong>
            </div>
            <button
              className={`model-status ${health?.available ? "connected" : ""}`}
              onClick={() => {
                void refreshHealth();
                setModal("about");
              }}
            >
              <span className="status-dot" />
              {health?.available ? "Local AI connected" : "Explore the demo"}
              <ShieldCheck size={15} />
            </button>
          </header>
          <main
            id="main"
            className={`content ${selected ? "editor-content" : ""}`}
          >
            {storageError && (
              <div className="error-banner" role="alert">
                <CircleAlert size={18} />
                <span>{storageError}</span>
                <button onClick={backup}>Export backup</button>
              </div>
            )}
            {selected ? (
              <>
                <button
                  className="back-link"
                  onClick={() => setSelectedId(null)}
                >
                  <ArrowLeft size={16} /> All proposals
                </button>
                <div className="editor-heading">
                  <div>
                    <div className="eyebrow">
                      {selected.clientName}{" "}
                      <span className={`badge ${selected.status}`}>
                        {statuses[selected.status]}
                      </span>
                    </div>
                    <h1>{selected.projectName}</h1>
                    <p>
                      {selected.source === "local-ai"
                        ? `${selected.model} · generated in ${(selected.generationMs / 1000).toFixed(1)}s`
                        : selected.model.startsWith("qwen")
                          ? `Recorded ${selected.model} response · original run ${(selected.generationMs / 1000).toFixed(1)}s · editable replay`
                          : "Curated example · all fields are editable"}
                      <span className="saved">
                        <Check size={13} />
                        {storageError ? "In memory" : "Saved on this browser"}
                      </span>
                    </p>
                  </div>
                  <button
                    className="button primary"
                    onClick={() => {
                      if (
                        !selected.clientName.trim() ||
                        !selected.projectName.trim() ||
                        !scopeSchema.safeParse(selected.scope).success
                      ) {
                        notify(
                          "Complete the project name, client, and scope fields before exporting.",
                        );
                        return;
                      }
                      setModal("export");
                    }}
                  >
                    <ArrowUpRight size={17} /> Preview & export
                  </button>
                </div>
                <div
                  className="editor-tabs"
                  role="tablist"
                  aria-label="Proposal views"
                >
                  {(
                    [
                      ["scope", "Scope of work", FileText],
                      [
                        "risks",
                        `Scope check (${selected.scope.risks.length})`,
                        ShieldCheck,
                      ],
                      ["preview", "Client proposal", ExternalLink],
                    ] as const
                  ).map(([value, label, Icon]) => (
                    <button
                      role="tab"
                      aria-selected={tab === value}
                      aria-controls="proposal-panel"
                      id={`tab-${value}`}
                      key={value}
                      className={tab === value ? "tab-active" : ""}
                      onClick={() => setTab(value)}
                    >
                      <Icon size={17} />
                      {label}
                    </button>
                  ))}
                </div>
                <div className="editor-grid">
                  <section
                    id="proposal-panel"
                    role="tabpanel"
                    aria-labelledby={`tab-${tab}`}
                    className="editor-panel"
                  >
                    {tab === "scope" && (
                      <>
                        <div className="section-heading">
                          <div>
                            <h2>A clear plan for good work</h2>
                            <p>
                              Review every estimate. You know the work best.
                            </p>
                          </div>
                          <span className="muted-icon">
                            <FileText size={23} />
                          </span>
                        </div>
                        <div className="field-grid">
                          <label>
                            Project name
                            <input
                              value={selected.projectName}
                              maxLength={120}
                              onChange={(e) =>
                                updateProposal({ projectName: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            Client
                            <input
                              value={selected.clientName}
                              maxLength={100}
                              onChange={(e) =>
                                updateProposal({ clientName: e.target.value })
                              }
                            />
                          </label>
                        </div>
                        <label className="summary-field">
                          Project overview
                          <textarea
                            rows={3}
                            value={selected.scope.summary}
                            maxLength={1400}
                            onChange={(e) =>
                              updateProposal({
                                scope: {
                                  ...selected.scope,
                                  summary: e.target.value,
                                },
                              })
                            }
                          />
                        </label>
                        <div className="sub-heading">
                          <h3>Deliverables</h3>
                          <span>
                            {selected.scope.deliverables.length} pieces of the
                            project
                          </span>
                        </div>
                        <div className="deliverables">
                          {selected.scope.deliverables.map((d, i) => (
                            <div className="deliverable" key={i}>
                              <span className="item-number">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <div className="deliverable-fields">
                                <input
                                  aria-label={`Deliverable ${i + 1} title`}
                                  value={d.title}
                                  maxLength={100}
                                  onChange={(e) =>
                                    updateProposal({
                                      scope: {
                                        ...selected.scope,
                                        deliverables:
                                          selected.scope.deliverables.map(
                                            (item, n) =>
                                              n === i
                                                ? {
                                                    ...item,
                                                    title: e.target.value,
                                                  }
                                                : item,
                                          ),
                                      },
                                    })
                                  }
                                />
                                <textarea
                                  aria-label={`Deliverable ${i + 1} description`}
                                  rows={2}
                                  value={d.description}
                                  maxLength={600}
                                  onChange={(e) =>
                                    updateProposal({
                                      scope: {
                                        ...selected.scope,
                                        deliverables:
                                          selected.scope.deliverables.map(
                                            (item, n) =>
                                              n === i
                                                ? {
                                                    ...item,
                                                    description: e.target.value,
                                                  }
                                                : item,
                                          ),
                                      },
                                    })
                                  }
                                />
                              </div>
                              <label className="hours-field">
                                <input
                                  aria-label={`Deliverable ${i + 1} hours`}
                                  type="number"
                                  min={1}
                                  max={200}
                                  step={0.5}
                                  value={d.hours}
                                  onChange={(e) => {
                                    const value = Number(e.target.value);
                                    if (value >= 1 && value <= 200)
                                      updateProposal({
                                        scope: {
                                          ...selected.scope,
                                          deliverables:
                                            selected.scope.deliverables.map(
                                              (item, n) =>
                                                n === i
                                                  ? { ...item, hours: value }
                                                  : item,
                                            ),
                                        },
                                      });
                                  }}
                                />
                                <span>hours</span>
                              </label>
                              <button
                                className="icon-button delete-item"
                                aria-label={`Remove deliverable ${i + 1}`}
                                disabled={
                                  selected.scope.deliverables.length === 1
                                }
                                onClick={() =>
                                  updateProposal({
                                    scope: {
                                      ...selected.scope,
                                      deliverables:
                                        selected.scope.deliverables.filter(
                                          (_, n) => n !== i,
                                        ),
                                    },
                                  })
                                }
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          className="text-button add-deliverable"
                          disabled={selected.scope.deliverables.length >= 8}
                          onClick={() =>
                            updateProposal({
                              scope: {
                                ...selected.scope,
                                deliverables: [
                                  ...selected.scope.deliverables,
                                  {
                                    title: "New deliverable",
                                    description: "Describe the agreed work.",
                                    hours: 4,
                                  },
                                ],
                              },
                            })
                          }
                        >
                          <Plus size={16} /> Add deliverable
                        </button>
                        <h3 className="sub-heading">Outside this scope</h3>
                        <p className="helper">
                          Clear boundaries make better working relationships.
                        </p>
                        {selected.scope.exclusions.map((item, i) => (
                          <label key={i} className="list-field">
                            <span>—</span>
                            <input
                              aria-label={`Exclusion ${i + 1}`}
                              value={item}
                              maxLength={300}
                              onChange={(e) =>
                                updateProposal({
                                  scope: {
                                    ...selected.scope,
                                    exclusions: selected.scope.exclusions.map(
                                      (s, n) => (n === i ? e.target.value : s),
                                    ),
                                  },
                                })
                              }
                            />
                          </label>
                        ))}
                        <details className="original-brief">
                          <summary>See the original client brief</summary>
                          <p>{selected.brief}</p>
                        </details>
                      </>
                    )}
                    {tab === "risks" && (
                      <>
                        <div className="section-heading">
                          <div>
                            <h2>Catch the “one more thing”</h2>
                            <p>
                              Private notes to review before you share your
                              proposal.
                            </p>
                          </div>
                          <ShieldCheck size={23} />
                        </div>
                        <div className="risk-intro">
                          <LockKeyhole size={17} />
                          <span>
                            Risk notes stay out of the client export. Questions
                            are included.
                          </span>
                        </div>
                        {selected.scope.risks.map((risk, i) => (
                          <div
                            key={i}
                            className={`risk-card risk-${risk.severity}`}
                          >
                            <div>
                              <span className={`risk-level ${risk.severity}`}>
                                {risk.severity} attention
                              </span>
                              <CircleAlert size={18} />
                            </div>
                            <h3>{risk.title}</h3>
                            <p>{risk.detail}</p>
                          </div>
                        ))}
                        <div className="sub-heading">
                          <h3>Questions worth asking</h3>
                          <span>Before you agree to the scope</span>
                        </div>
                        {selected.scope.questions.map((question, i) => (
                          <label className="question-field" key={i}>
                            <span>{i + 1}</span>
                            <textarea
                              aria-label={`Client question ${i + 1}`}
                              value={question}
                              maxLength={300}
                              rows={2}
                              onChange={(e) =>
                                updateProposal({
                                  scope: {
                                    ...selected.scope,
                                    questions: selected.scope.questions.map(
                                      (s, n) => (n === i ? e.target.value : s),
                                    ),
                                  },
                                })
                              }
                            />
                          </label>
                        ))}
                      </>
                    )}
                    {tab === "preview" && (
                      <ClientDocument p={selected} settings={settings} />
                    )}
                  </section>
                  <aside
                    className="quote-sidebar"
                    aria-label="Quote and status"
                  >
                    <div className="quote-card">
                      <div className="quote-title">
                        <span>THE INVESTMENT</span>
                        <Wallet size={18} />
                      </div>
                      <h2>{money(quote(selected).total, selected.currency)}</h2>
                      <p className="quote-subtitle">
                        A considered estimate for your work.
                      </p>
                      <div className="quote-inputs">
                        <label>
                          Your hourly rate
                          <div className="currency-input">
                            <span>{selected.currency}</span>
                            <input
                              type="number"
                              min={1}
                              max={10000}
                              step={0.5}
                              value={selected.hourlyRate}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                if (value >= 1 && value <= 10000)
                                  updateProposal({ hourlyRate: value });
                              }}
                            />
                          </div>
                        </label>
                        <label>
                          Contingency
                          <div className="currency-input">
                            <input
                              type="number"
                              min={0}
                              max={50}
                              value={selected.bufferPercent}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                if (value >= 0 && value <= 50)
                                  updateProposal({ bufferPercent: value });
                              }}
                            />
                            <span>%</span>
                          </div>
                        </label>
                      </div>
                      <div className="quote-lines">
                        <div>
                          <span>Estimated effort</span>
                          <strong>{quote(selected).hours} hours</strong>
                        </div>
                        <div>
                          <span>Base estimate</span>
                          <strong>
                            {money(quote(selected).subtotal, selected.currency)}
                          </strong>
                        </div>
                        <div>
                          <span>Contingency ({selected.bufferPercent}%)</span>
                          <strong>
                            {money(quote(selected).buffer, selected.currency)}
                          </strong>
                        </div>
                        <div className="quote-total">
                          <span>Project total</span>
                          <strong>
                            {money(quote(selected).total, selected.currency)}
                          </strong>
                        </div>
                      </div>
                      <div className="deposit-note">
                        <span>Suggested 50% deposit</span>
                        <strong>
                          {money(quote(selected).deposit, selected.currency)}
                        </strong>
                      </div>
                      <label className="status-select">
                        Proposal status
                        <select
                          value={selected.status}
                          onChange={(e) =>
                            updateProposal({
                              status: e.target.value as Proposal["status"],
                            })
                          }
                        >
                          <option value="draft">Draft</option>
                          <option value="ready">Ready to share</option>
                          <option value="accepted">Accepted</option>
                        </select>
                      </label>
                      <p className="helper">
                        Status is your own record. Nothing is sent to the
                        client.
                      </p>
                    </div>
                    <div className="quiet-note">
                      <ShieldCheck size={18} />
                      <p>
                        AI gives you a starting point.
                        <br />
                        <strong>You make the final call.</strong>
                      </p>
                    </div>
                    <button
                      className="text-button danger-text"
                      onClick={() => setModal("delete")}
                    >
                      <Trash2 size={15} /> Delete proposal
                    </button>
                  </aside>
                </div>
              </>
            ) : page === "settings" ? (
              <>
                <div className="page-heading">
                  <div className="eyebrow">A WORKSPACE THAT FEELS LIKE YOU</div>
                  <h1>The small details matter.</h1>
                  <p>Your identity, your rates, your data.</p>
                </div>
                <div className="settings-grid">
                  <section className="panel settings-panel">
                    <div className="section-heading">
                      <div>
                        <h2>Your studio</h2>
                        <p>These details appear on your exported proposals.</p>
                      </div>
                      <Settings2 size={21} />
                    </div>
                    <label>
                      Your name
                      <input
                        value={settings.name}
                        maxLength={100}
                        onChange={(e) =>
                          setSettings({ ...settings, name: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Studio or business name
                      <input
                        value={settings.studio}
                        maxLength={100}
                        onChange={(e) =>
                          setSettings({ ...settings, studio: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Email
                      <input
                        type="email"
                        value={settings.email}
                        maxLength={200}
                        placeholder="you@yourstudio.com"
                        onChange={(e) =>
                          setSettings({ ...settings, email: e.target.value })
                        }
                      />
                    </label>
                    <div className="sub-heading">
                      <h3>Your starting point</h3>
                    </div>
                    <div className="field-grid">
                      <label>
                        Default hourly rate
                        <input
                          type="number"
                          min={1}
                          max={10000}
                          value={settings.hourlyRate}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            if (value >= 1 && value <= 10000)
                              setSettings({ ...settings, hourlyRate: value });
                          }}
                        />
                      </label>
                      <label>
                        Currency
                        <select
                          value={settings.currency}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              currency: e.target.value as Settings["currency"],
                            })
                          }
                        >
                          {["USD", "EUR", "GBP", "INR"].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label>
                      Default contingency (%)
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={settings.bufferPercent}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          if (value >= 0 && value <= 50)
                            setSettings({ ...settings, bufferPercent: value });
                        }}
                      />
                    </label>
                    <div className="inline-saved">
                      <CheckCircle2 size={16} />
                      {storageError
                        ? "Changes are in memory. Export a backup."
                        : "Changes save automatically on this browser."}
                    </div>
                  </section>
                  <div>
                    <section className="panel settings-panel">
                      <h2>Your data stays yours</h2>
                      <p>
                        Proposals live in this browser, on this device. A backup
                        gives you a portable copy. Imports add new proposals
                        without replacing existing work.
                      </p>
                      <button
                        className="button secondary full-width"
                        onClick={backup}
                      >
                        <ArrowDownToLine size={17} /> Export workspace backup
                      </button>
                      <button
                        className="button secondary full-width"
                        onClick={() => importInput.current?.click()}
                      >
                        <Upload size={17} /> Import proposals
                      </button>
                      <input
                        ref={importInput}
                        className="visually-hidden"
                        type="file"
                        accept="application/json,.json"
                        aria-label="Import workspace backup"
                        onChange={(e) => void importBackup(e.target.files?.[0])}
                      />
                    </section>
                    <section className="panel settings-panel ai-settings">
                      <div className="eyebrow">OPEN AI, ON YOUR TERMS</div>
                      <h2>Connect your local model</h2>
                      <p>
                        Run the app and Qwen on your own machine. No API
                        subscription needed.
                      </p>
                      <code>
                        npm run ai:setup -- --download
                        <br />
                        npm run ai:start
                      </code>
                      <button
                        className="text-button"
                        onClick={() => void refreshHealth()}
                      >
                        <ShieldCheck size={16} /> Check connection
                      </button>
                      <p className="connection-detail">
                        {health?.available
                          ? `Connected to ${health.model}`
                          : "Local model server is not connected."}
                      </p>
                      <label>
                        Workspace access token{" "}
                        <span className="optional">Optional</span>
                        <input
                          type="password"
                          value={token}
                          autoComplete="off"
                          onChange={(e) => setToken(e.target.value)}
                          placeholder="Only if APP_TOKEN is configured"
                        />
                      </label>
                      <p className="helper">Kept in memory for this session.</p>
                    </section>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="page-heading heading-with-action">
                  <div>
                    <div className="eyebrow">
                      <span className="tiny-line" />{" "}
                      {page === "overview"
                        ? "A LITTLE CLARITY GOES A LONG WAY"
                        : "YOUR WORK, TAKING SHAPE"}
                    </div>
                    <h1>
                      {page === "overview" ? (
                        <>
                          Good work starts
                          <br />
                          with a clear scope
                          <span className="heading-dot">.</span>
                        </>
                      ) : (
                        <>
                          Room for your next
                          <br />
                          great project<span className="heading-dot">.</span>
                        </>
                      )}
                    </h1>
                    <p>
                      {page === "overview"
                        ? "Less guesswork. Better boundaries. Proposals you feel good about."
                        : "Every brief, every estimate, every thoughtful next step."}
                    </p>
                  </div>
                  <button className="button primary" onClick={newProposal}>
                    <Plus size={18} /> New proposal
                  </button>
                </div>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div>
                      <span>In your workspace</span>
                      <FileText size={18} />
                    </div>
                    <strong>{String(proposals.length).padStart(2, "0")}</strong>
                    <p>
                      {proposals.filter((p) => p.status === "draft").length}{" "}
                      drafts with possibility
                    </p>
                  </div>
                  <div className="stat-card">
                    <div>
                      <span>Quoted value · {settings.currency}</span>
                      <Wallet size={18} />
                    </div>
                    <strong>{money(total, settings.currency)}</strong>
                    <p>
                      Across {priced.length} proposals · estimated, before tax
                    </p>
                  </div>
                  <div className="stat-card">
                    <div>
                      <span>Ready for the next step</span>
                      <CheckCheck size={18} />
                    </div>
                    <strong>
                      {String(
                        proposals.filter((p) => p.status !== "draft").length,
                      ).padStart(2, "0")}
                    </strong>
                    <p>{pendingQuestions} open questions in drafts</p>
                  </div>
                </div>
                {page === "overview" && (
                  <section className="start-card">
                    <div className="start-content">
                      <span className="start-label">
                        <Sparkles size={15} /> A HEAD START, NOT A SHORTCUT
                      </span>
                      <h2>
                        That messy brief?
                        <br />
                        There’s a good proposal in there.
                      </h2>
                      <p>
                        Find the deliverables, spot the loose ends, and put a
                        fair price on your time. You bring the judgment.
                      </p>
                      <button className="button light" onClick={newProposal}>
                        Let’s give it some shape <ArrowRight size={17} />
                      </button>
                    </div>
                    <div className="paper-scene" aria-hidden="true">
                      <div className="paper-back">
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className="paper-front">
                        <div className="paper-top">
                          <span className="mini-brand">S</span>
                          <span className="paper-caption">
                            A CLEARER WAY FORWARD
                          </span>
                        </div>
                        <h3>
                          Good things,
                          <br />
                          well defined.
                        </h3>
                        <div className="paper-line wide" />
                        <div className="paper-line" />
                        <div className="paper-check">
                          <span>
                            <Check size={10} />
                          </span>{" "}
                          A scope you can stand behind
                        </div>
                        <div className="paper-check">
                          <span>
                            <Check size={10} />
                          </span>{" "}
                          A price that values your time
                        </div>
                        <div className="paper-stamp">
                          <ShieldCheck size={14} /> Yours to make your own
                        </div>
                      </div>
                      <div className="floating-spark">
                        <Sparkles size={23} />
                      </div>
                      <div className="scene-dot dot-one" />
                      <div className="scene-dot dot-two" />
                    </div>
                  </section>
                )}
                <section className="proposals-section">
                  <div className="section-heading">
                    <div>
                      <h2>
                        {page === "overview"
                          ? "Your proposals"
                          : "All proposals"}{" "}
                        <span className="heading-count">
                          {proposals.length}
                        </span>
                      </h2>
                      <p>
                        {proposals.length
                          ? "A place for the work you’re putting into the world."
                          : "Your next project starts with a brief."}
                      </p>
                    </div>
                    {page === "overview" && (
                      <button
                        className="text-button"
                        onClick={() => navigate("proposals")}
                      >
                        View all <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                  <div className="table-toolbar">
                    <div
                      className="filter-tabs"
                      role="group"
                      aria-label="Filter proposals"
                    >
                      {[
                        ["all", "All proposals"],
                        ["draft", "Drafts"],
                        ["ready", "Ready to share"],
                        ["accepted", "Accepted"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          aria-pressed={filter === value}
                          className={filter === value ? "filter-active" : ""}
                          onClick={() => setFilter(value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <label className="search-field">
                      <Search size={16} />
                      <input
                        aria-label="Search proposals"
                        placeholder="Find a proposal…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      {search && (
                        <button
                          aria-label="Clear search"
                          onClick={() => setSearch("")}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </label>
                  </div>
                  <div className="proposal-table">
                    <div className="table-head">
                      <span>PROJECT / CLIENT</span>
                      <span>STATUS</span>
                      <span>ESTIMATE</span>
                      <span>CREATED</span>
                      <span />
                    </div>
                    {visible.map((p, i) => (
                      <button
                        className="proposal-row"
                        key={p.id}
                        onClick={() => openProposal(p)}
                      >
                        <div className="project-cell">
                          <span className={`client-avatar avatar-${i % 3}`}>
                            {initials(p.clientName)}
                          </span>
                          <span>
                            <strong>{p.projectName}</strong>
                            <small>
                              {p.clientName}{" "}
                              <span className="example-label">
                                {p.source === "example"
                                  ? p.model.startsWith("qwen")
                                    ? "· Recorded AI"
                                    : "· Example"
                                  : "· Local AI"}
                              </span>
                            </small>
                          </span>
                        </div>
                        <span className={`badge ${p.status}`}>
                          <span />
                          {statuses[p.status]}
                        </span>
                        <span className="row-price">
                          {money(quote(p).total, p.currency)}
                          <small>{quote(p).hours} estimated hours</small>
                        </span>
                        <span className="row-date">{date(p.createdAt)}</span>
                        <ArrowUpRight className="row-arrow" size={18} />
                      </button>
                    ))}
                    {visible.length === 0 && (
                      <div className="empty-state">
                        <FolderOpen size={32} />
                        <h3>
                          {search || filter !== "all"
                            ? "No proposals match just yet."
                            : "A blank page, a fresh start."}
                        </h3>
                        <p>
                          {search || filter !== "all"
                            ? "Try another search or clear your filters."
                            : "Bring a client brief. We’ll help you find its shape."}
                        </p>
                        <button
                          className="button secondary"
                          onClick={() => {
                            if (search || filter !== "all") {
                              setSearch("");
                              setFilter("all");
                            } else newProposal();
                          }}
                        >
                          {search || filter !== "all"
                            ? "Clear filters"
                            : "Create your first proposal"}
                        </button>
                      </div>
                    )}
                  </div>
                </section>
                <div className="bottom-note">
                  <span>
                    <LockKeyhole size={14} /> Saved in your browser. No account
                    needed.
                  </span>
                  <button onClick={() => setModal("about")}>
                    Made for the way you work <ArrowUpRight size={14} />
                  </button>
                </div>
              </>
            )}
          </main>
          <footer className="app-footer">
            <span>Thoughtfully scoped. Independently made.</span>
            <span>
              ScopeCraft <span> / </span> Open by design
            </span>
          </footer>
        </div>
      </div>

      {modal === "new" && (
        <Modal
          title="Let’s find the shape of your project."
          wide
          onClose={() => {
            if (!generating) setModal(null);
          }}
        >
          <form onSubmit={generate}>
            <div className="new-intro">
              <span className="badge draft">
                <Sparkles size={12} /> Brief → scope → proposal
              </span>
              <p>
                Paste the email, notes, or wonderfully messy brief. Start with
                what you know.
              </p>
            </div>
            <div className="example-picker">
              <span>NEED A LITTLE INSPIRATION?</span>
              <div>
                {exampleBriefs.map((e, i) => (
                  <button
                    type="button"
                    key={e.label}
                    disabled={generating}
                    onClick={() => {
                      setDraft({
                        ...e,
                        hourlyRate: settings.hourlyRate,
                        currency: settings.currency,
                        bufferPercent: settings.bufferPercent,
                      });
                      setGenerationError("");
                    }}
                  >
                    <span>{["☕", "◒", "✳"][i]}</span>
                    {e.label}
                    <ArrowUpRight size={13} />
                  </button>
                ))}
              </div>
            </div>
            <fieldset disabled={generating}>
              <div className="field-grid">
                <label>
                  Client name
                  <input
                    required
                    maxLength={100}
                    value={draft.clientName}
                    onChange={(e) =>
                      setDraft({ ...draft, clientName: e.target.value })
                    }
                    placeholder="Little Fern Café"
                  />
                </label>
                <label>
                  Project name
                  <input
                    required
                    maxLength={120}
                    value={draft.projectName}
                    onChange={(e) =>
                      setDraft({ ...draft, projectName: e.target.value })
                    }
                    placeholder="A fresh home on the web"
                  />
                </label>
              </div>
              <label className="brief-label">
                The client brief <span>{draft.brief.length} / 8,000</span>
                <textarea
                  required
                  minLength={80}
                  maxLength={8000}
                  rows={7}
                  placeholder="What does the client need? Include their goals, requested deliverables, timeline, and anything that feels unclear…"
                  value={draft.brief}
                  onChange={(e) =>
                    setDraft({ ...draft, brief: e.target.value })
                  }
                />
              </label>
              <div className="field-grid three-fields">
                <label>
                  Your hourly rate
                  <input
                    required
                    type="number"
                    min={1}
                    max={10000}
                    step="0.01"
                    value={draft.hourlyRate}
                    onChange={(e) =>
                      setDraft({ ...draft, hourlyRate: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Currency
                  <select
                    value={draft.currency}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        currency: e.target.value as Brief["currency"],
                      })
                    }
                  >
                    {["USD", "EUR", "GBP", "INR"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Contingency (%)
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={draft.bufferPercent}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        bufferPercent: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
            </fieldset>
            {generationError && (
              <div className="error-banner" role="alert">
                <CircleAlert size={17} />
                <span>{generationError}</span>
              </div>
            )}
            {!health?.available && (
              <div className="demo-notice">
                <Leaf size={20} />
                <div>
                  <strong>A little taste of the workspace</strong>
                  <p>
                    AI generation needs the local app and model server. Explore
                    an editable example now, or see setup in workspace settings.
                  </p>
                </div>
              </div>
            )}
            <div className="modal-actions">
              <span className="privacy-line">
                <LockKeyhole size={14} />
                {health?.available
                  ? "Processed by your connected model server"
                  : "Examples stay in your browser"}
              </span>
              {generating ? (
                <div className="generating-actions">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => cancelGeneration.current?.abort()}
                  >
                    Cancel
                  </button>
                  <span className="button primary">
                    <LoaderCircle size={17} className="spin" /> Finding the
                    shape… {elapsed}s
                  </span>
                </div>
              ) : (
                <button
                  type="submit"
                  className="button primary"
                  disabled={!health?.available}
                >
                  <Sparkles size={17} /> Shape my proposal
                </button>
              )}
            </div>
            {!health?.available && (
              <div className="example-demo-action">
                <button
                  type="button"
                  className="text-button"
                  onClick={() => loadExample(-1)}
                >
                  <Sparkles size={15} /> Explore the recorded Qwen draft
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    loadExample(
                      Math.max(
                        0,
                        exampleBriefs.findIndex(
                          (e) => e.clientName === draft.clientName,
                        ),
                      ),
                    )
                  }
                >
                  Explore an editable example <ArrowRight size={16} />
                </button>
              </div>
            )}
          </form>
        </Modal>
      )}
      {modal === "about" && (
        <Modal
          title="Independent work, with a little clarity."
          onClose={() => setModal(null)}
        >
          <div className="about-content">
            <div className="about-mark">
              <Leaf size={32} />
            </div>
            <p>
              ScopeCraft helps freelancers turn client briefs into proposals
              with clear boundaries and considered estimates.
            </p>
            <div className="about-feature">
              <ShieldCheck size={20} />
              <div>
                <strong>Open AI at the core</strong>
                <p>
                  Qwen3 generates the scope, exclusions, questions, and risk
                  notes through llama.cpp. You review the result.
                </p>
              </div>
            </div>
            <div className="about-feature">
              <LockKeyhole size={20} />
              <div>
                <strong>Your own workspace</strong>
                <p>
                  Proposals are saved in this browser. Local setup runs
                  inference on your machine. Export a backup before clearing
                  browser data.
                </p>
              </div>
            </div>
            <div className="about-feature">
              <Wallet size={20} />
              <div>
                <strong>Your rate. Your judgment.</strong>
                <p>
                  Prices are calculated from editable hours and your rate. No
                  AI-generated totals. No proposal is sent automatically.
                </p>
              </div>
            </div>
            <div className="setup-box">
              <strong>For live, private generation</strong>
              <code>
                npm install
                <br />
                npm run ai:setup -- --download
                <br />
                npm run ai:start <span># terminal 1</span>
                <br />
                npm run dev <span># terminal 2</span>
              </code>
              <p>
                Linux x64 gets a verified runtime automatically. macOS can use{" "}
                <code>brew install llama.cpp</code>. Initial setup downloads the
                weights; inference then runs offline.
              </p>
            </div>
            <a
              className="button secondary full-width"
              href="https://github.com/harshalranjhani/scopecraft"
              target="_blank"
              rel="noreferrer"
            >
              Explore the open-source project <ArrowUpRight size={17} />
            </a>
          </div>
        </Modal>
      )}
      {modal === "export" && selected && (
        <Modal
          title="Ready to put your name on it?"
          wide
          onClose={() => setModal(null)}
        >
          <p className="export-intro">
            Review the client version below. Your private risk notes are left
            out.
          </p>
          <div className="export-toolbar">
            <button className="button primary" onClick={() => window.print()}>
              <ArrowDownToLine size={16} /> Print / Save PDF
            </button>
            <button
              className="button secondary"
              onClick={() => {
                downloadFile(
                  filename(selected.projectName) + ".md",
                  proposalMarkdown(selected, settings),
                );
                notify("Client proposal downloaded.");
              }}
            >
              <FileText size={16} /> Download Markdown
            </button>
            <button
              className="icon-button"
              aria-label="Copy proposal to clipboard"
              onClick={() => {
                void navigator.clipboard
                  .writeText(proposalMarkdown(selected, settings))
                  .then(() => notify("Proposal copied to clipboard."))
                  .catch(() =>
                    notify("Clipboard unavailable. Download Markdown instead."),
                  );
              }}
            >
              <Copy size={18} />
            </button>
          </div>
          <div className="export-preview">
            <ClientDocument p={selected} settings={settings} />
          </div>
        </Modal>
      )}
      {modal === "delete" && selected && (
        <Modal title="Delete this proposal?" onClose={() => setModal(null)}>
          <p className="delete-description">
            “{selected.projectName}” will be removed from this browser. Export a
            backup first if you’d like to keep a copy.
          </p>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setModal(null)}>
              Keep proposal
            </button>
            <button
              className="button danger"
              onClick={() => {
                setProposals((list) =>
                  list.filter((p) => p.id !== selected.id),
                );
                setSelectedId(null);
                setModal(null);
                notify("Proposal deleted.");
              }}
            >
              Delete proposal
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {selected && (
        <div className="print-document">
          <ClientDocument p={selected} settings={settings} />
        </div>
      )}
    </>
  );
}
