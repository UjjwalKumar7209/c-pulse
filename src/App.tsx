import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpDown,
  BarChart3,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Download,
  FileUp,
  LayoutDashboard,
  ListChecks,
  Moon,
  PanelLeft,
  RotateCcw,
  Search,
  Sun,
  Target,
  X,
} from "lucide-react";
import questionsJson from "../data.json";

type Question = { id: number; questionName: string };
type Filter = "all" | "solved" | "unsolved";
type Sort = "asc" | "desc" | "alpha";
type Theme = "light" | "dark";
type ProgressData = { solvedIds: number[]; solvedAt: Record<string, string> };

const questions = questionsJson as Question[];
const validQuestionIds = new Set(questions.map((question) => question.id));
const progressKey = "cpulse-progress-v1";
const themeKey = "cpulse-theme-v1";

function readProgress(): ProgressData {
  try {
    const stored = JSON.parse(
      localStorage.getItem(progressKey) ?? "{}",
    ) as Partial<ProgressData>;
    const solvedIds = Array.isArray(stored.solvedIds)
      ? [
          ...new Set(
            stored.solvedIds.filter(
              (id): id is number =>
                typeof id === "number" && validQuestionIds.has(id),
            ),
          ),
        ]
      : [];
    const solvedAt =
      stored.solvedAt && typeof stored.solvedAt === "object"
        ? stored.solvedAt
        : {};
    return { solvedIds, solvedAt };
  } catch {
    return { solvedIds: [], solvedAt: {} };
  }
}

function readTheme(): Theme {
  return localStorage.getItem(themeKey) === "dark" ? "dark" : "light";
}

function App() {
  const [progress, setProgress] = useState<ProgressData>(() => readProgress());
  const [theme, setTheme] = useState<Theme>(() => readTheme());
  const [activeSection, setActiveSection] = useState<"overview" | "questions">(
    "overview",
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("asc");
  const [toast, setToast] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const solvedSet = useMemo(
    () => new Set(progress.solvedIds),
    [progress.solvedIds],
  );
  const stats = useMemo(() => {
    const solved = progress.solvedIds.length;
    return {
      solved,
      total: questions.length,
      unsolved: questions.length - solved,
      percent: questions.length ? (solved / questions.length) * 100 : 0,
    };
  }, [progress.solvedIds]);

  const filteredQuestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return questions
      .filter((question) => {
        const matchesSearch =
          !normalizedQuery ||
          question.questionName.toLowerCase().includes(normalizedQuery) ||
          String(question.id).includes(normalizedQuery);
        const matchesFilter =
          filter === "all" ||
          (filter === "solved"
            ? solvedSet.has(question.id)
            : !solvedSet.has(question.id));
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) =>
        sort === "alpha"
          ? a.questionName.localeCompare(b.questionName)
          : sort === "asc"
            ? a.id - b.id
            : b.id - a.id,
      );
  }, [filter, query, sort, solvedSet]);

  const recentQuestions = useMemo(
    () =>
      [...progress.solvedIds]
        .sort(
          (a, b) =>
            new Date(progress.solvedAt[b] ?? 0).getTime() -
            new Date(progress.solvedAt[a] ?? 0).getTime(),
        )
        .slice(0, 5)
        .map((id) => questions.find((question) => question.id === id))
        .filter(Boolean) as Question[],
    [progress],
  );
  const solvedToday = progress.solvedIds.filter(
    (id) =>
      progress.solvedAt[id] &&
      new Date(progress.solvedAt[id]).toDateString() ===
        new Date().toDateString(),
  ).length;

  useEffect(() => {
    localStorage.setItem(progressKey, JSON.stringify(progress));
  }, [progress]);
  useEffect(() => {
    localStorage.setItem(themeKey, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function toggleQuestion(id: number) {
    const isSolved = solvedSet.has(id);
    setProgress((current) => {
      const solvedIds = isSolved
        ? current.solvedIds.filter((solvedId) => solvedId !== id)
        : [...current.solvedIds, id];
      const solvedAt = { ...current.solvedAt };
      if (isSolved) delete solvedAt[id];
      else solvedAt[id] = new Date().toISOString();
      return { solvedIds, solvedAt };
    });
    setToast(isSolved ? "Question marked unsolved" : "Question marked solved");
  }

  function updateVisibleQuestions(solved: boolean) {
    const visibleIds = new Set(
      filteredQuestions.map((question) => question.id),
    );
    setProgress((current) => {
      const solvedIds = solved
        ? [...new Set([...current.solvedIds, ...visibleIds])]
        : current.solvedIds.filter((id) => !visibleIds.has(id));
      const solvedAt = { ...current.solvedAt };
      if (solved)
        visibleIds.forEach((id) => {
          if (!solvedSet.has(id)) solvedAt[id] = new Date().toISOString();
        });
      else visibleIds.forEach((id) => delete solvedAt[id]);
      return { solvedIds, solvedAt };
    });
    setToast(
      solved
        ? `${visibleIds.size} question${visibleIds.size === 1 ? "" : "s"} marked solved`
        : `${visibleIds.size} question${visibleIds.size === 1 ? "" : "s"} marked unsolved`,
    );
  }

  function exportProgress() {
    const blob = new Blob(
      [
        JSON.stringify(
          { version: 1, exportedAt: new Date().toISOString(), ...progress },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cpulse-progress.json";
    link.click();
    URL.revokeObjectURL(url);
    setToast("Progress exported");
  }

  function importProgress(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(
          String(reader.result),
        ) as Partial<ProgressData>;
        if (
          !Array.isArray(parsed.solvedIds) ||
          parsed.solvedIds.some(
            (id) => typeof id !== "number" || !validQuestionIds.has(id),
          )
        )
          throw new Error("invalid");
        if (
          !window.confirm(
            "Importing will replace your current progress. Continue?",
          )
        )
          return;
        const solvedIds = [...new Set(parsed.solvedIds)];
        const solvedAt =
          parsed.solvedAt && typeof parsed.solvedAt === "object"
            ? Object.fromEntries(
                solvedIds.map((id) => [
                  id,
                  parsed.solvedAt?.[id] ?? new Date().toISOString(),
                ]),
              )
            : Object.fromEntries(
                solvedIds.map((id) => [id, new Date().toISOString()]),
              );
        setProgress({ solvedIds, solvedAt });
        setShowImport(false);
        setToast("Progress imported");
      } catch {
        setToast("That file is not a valid CPulse export");
      }
    };
    reader.readAsText(file);
  }

  const navItems = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "questions" as const, label: "Questions", icon: ListChecks },
  ];

  return (
    <div className="min-h-screen bg-(--bg) text-(--text) transition-colors">
      <aside className="sidebar fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-(--border) bg-(--surface) lg:flex lg:flex-col">
        <div className="flex h-20 items-center gap-3 border-b border-(--border) px-7">
          <div className="brand-mark">
            <Target size={19} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-[15px] font-bold tracking-[-0.03em]">
              CPulse
            </div>
            <div className="text-[11px] text-(--muted)">
              Practice with purpose
            </div>
          </div>
        </div>
        <nav className="space-y-1 px-3 py-7">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`nav-item ${activeSection === id ? "active" : ""}`}
            >
              <Icon size={17} />
              {label}
              {id === "questions" && (
                <span className="ml-auto text-[11px] text-(--muted)">
                  {stats.total}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto border-t border-(--border) p-4">
          <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-(--muted)">
            Workspace
          </div>
          <button className="nav-item" onClick={() => setShowImport(true)}>
            <FileUp size={17} />
            Import progress
          </button>
          <button className="nav-item" onClick={exportProgress}>
            <Download size={17} />
            Export progress
          </button>
        </div>
      </aside>
      <main className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-(--border) bg-(--surface)/95 px-5 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            <button
              className="icon-button lg:hidden"
              aria-label="Open navigation"
            >
              <PanelLeft size={18} />
            </button>
            <div className="lg:hidden">
              <span className="font-bold">CPulse</span>
            </div>
            <div className="hidden items-center gap-2 text-sm text-(--muted) sm:flex">
              <span>Workspace</span>
              <ChevronRight size={14} />
              <span className="text-(--text)">
                {activeSection === "overview" ? "Overview" : "Questions"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="icon-button"
              aria-label={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button className="avatar" aria-label="Account menu">
              U
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-350 px-5 py-8 sm:px-8 lg:px-10 lg:py-11">
          {activeSection === "overview" ? (
            <Overview
              stats={stats}
              recentQuestions={recentQuestions}
              solvedToday={solvedToday}
              onOpenQuestions={() => setActiveSection("questions")}
            />
          ) : (
            <QuestionsView
              questions={filteredQuestions}
              total={stats.total}
              solvedCount={stats.solved}
              filter={filter}
              setFilter={setFilter}
              sort={sort}
              setSort={setSort}
              query={query}
              setQuery={setQuery}
              solvedSet={solvedSet}
              onToggle={toggleQuestion}
              onBulk={updateVisibleQuestions}
            />
          )}
        </div>
      </main>
      {showImport && (
        <ImportDialog
          onClose={() => setShowImport(false)}
          onImport={importProgress}
        />
      )}
      {showReset && (
        <ConfirmDialog
          title="Reset all progress?"
          body="This will mark all 494 questions as unsolved. Your question list will not be changed."
          confirmLabel="Reset progress"
          onClose={() => setShowReset(false)}
          onConfirm={() => {
            setProgress({ solvedIds: [], solvedAt: {} });
            setShowReset(false);
            setToast("Progress reset");
          }}
        />
      )}
      <button
        className="reset-fab"
        onClick={() => setShowReset(true)}
        aria-label="Reset all progress"
      >
        <RotateCcw size={15} /> <span>Reset</span>
      </button>
      {toast && (
        <div className="toast">
          <span className="toast-icon">
            <Check size={14} />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}

function Overview({
  stats,
  recentQuestions,
  solvedToday,
  onOpenQuestions,
}: {
  stats: { solved: number; total: number; unsolved: number; percent: number };
  recentQuestions: Question[];
  solvedToday: number;
  onOpenQuestions: () => void;
}) {
  const circumference = 2 * Math.PI * 44;
  return (
    <section className="space-y-9">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Progress overview</p>
          <h1 className="page-title">Your practice, in motion.</h1>
          <p className="mt-2 text-sm text-(--muted)">
            A clear view of your competitive programming journey.
          </p>
        </div>
        <button
          className="primary-button self-start sm:self-auto"
          onClick={onOpenQuestions}
        >
          <ListChecks size={16} />
          Continue solving
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total questions"
          value={stats.total}
          note="In your course"
          icon={ListChecks}
        />
        <StatCard
          label="Solved"
          value={stats.solved}
          note="Keep the streak alive"
          icon={CheckCheck}
          accent
        />
        <StatCard
          label="Unsolved"
          value={stats.unsolved}
          note="Ready for your next win"
          icon={CircleHelp}
        />
        <StatCard
          label="Completion"
          value={`${stats.percent.toFixed(1)}%`}
          note="Overall course progress"
          icon={BarChart3}
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="panel progress-panel">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Course completion</p>
              <h2 className="section-title">Progress at a glance</h2>
            </div>
            <div className="mini-status">
              <span className="status-dot" />
              Live
            </div>
          </div>
          <div className="mt-8 flex items-center gap-8 sm:gap-12">
            <div className="progress-ring">
              <svg
                width="112"
                height="112"
                viewBox="0 0 112 112"
                aria-label={`${stats.percent.toFixed(1)} percent complete`}
              >
                <circle
                  className="ring-track"
                  cx="56"
                  cy="56"
                  r="44"
                  fill="none"
                  strokeWidth="9"
                />
                <circle
                  className="ring-value"
                  cx="56"
                  cy="56"
                  r="44"
                  fill="none"
                  strokeWidth="9"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - stats.percent / 100)}
                />
              </svg>
              <div className="ring-label">
                <strong>{stats.percent.toFixed(1)}%</strong>
                <span>complete</span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex justify-between text-xs">
                <span className="font-semibold">Course progress</span>
                <span className="text-(--muted)">
                  {stats.solved} / {stats.total}
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${stats.percent}%` }}
                />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="metric-row">
                  <span className="legend-dot solved" />
                  Solved <strong>{stats.solved}</strong>
                </div>
                <div className="metric-row">
                  <span className="legend-dot unsolved" />
                  Remaining <strong>{stats.unsolved}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Today</p>
              <h2 className="section-title">Daily activity</h2>
            </div>
            <div className="today-count">{solvedToday}</div>
          </div>
          <p className="mt-2 text-sm text-(--muted)">questions solved today</p>
          <div className="activity-bars" aria-label="Weekly activity summary">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
              <div className="activity-day" key={`${day}-${index}`}>
                <div
                  className={`activity-bar ${index === 6 && solvedToday ? "today" : ""}`}
                  style={{
                    height: `${Math.max(14, [22, 38, 29, 52, 33, 18, solvedToday ? Math.min(80, 14 + solvedToday * 7) : 14][index])}%`,
                  }}
                />
                <span>{day}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-(--border) pt-4 text-xs text-(--muted)">
            <span className="status-dot inline-block" /> Small, consistent
            sessions add up.
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="eyebrow">Latest wins</p>
            <h2 className="section-title">Recently solved</h2>
          </div>
          <button className="text-button" onClick={onOpenQuestions}>
            View all <ChevronRight size={14} />
          </button>
        </div>
        {recentQuestions.length ? (
          <div className="recent-list">
            {recentQuestions.map((question) => (
              <div className="recent-row" key={question.id}>
                <span className="question-id">
                  #{String(question.id).padStart(3, "0")}
                </span>
                <span className="flex-1 truncate font-medium">
                  {question.questionName}
                </span>
                <Check size={16} className="text-(--success)" />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-recent">
            <Target size={22} />
            <p>Your solved questions will appear here.</p>
            <button className="text-button" onClick={onOpenQuestions}>
              Browse questions <ChevronRight size={14} />
            </button>
          </div>
        )}
      </section>
    </section>
  );
}

function StatCard({
  label,
  value,
  note,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: typeof ListChecks;
  accent?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${accent ? "accent" : ""}`}>
        <Icon size={17} />
      </div>
      <div className="mt-4 text-[12px] font-medium text-(--muted)">{label}</div>
      <div className="mt-1 text-[27px] font-bold tracking-[-0.04em]">
        {value}
      </div>
      <div className="mt-1 text-[11px] text-(--muted)">{note}</div>
    </div>
  );
}

function QuestionsView({
  questions,
  total,
  solvedCount,
  filter,
  setFilter,
  sort,
  setSort,
  query,
  setQuery,
  solvedSet,
  onToggle,
  onBulk,
}: {
  questions: Question[];
  total: number;
  solvedCount: number;
  filter: Filter;
  setFilter: (filter: Filter) => void;
  sort: Sort;
  setSort: (sort: Sort) => void;
  query: string;
  setQuery: (query: string) => void;
  solvedSet: Set<number>;
  onToggle: (id: number) => void;
  onBulk: (solved: boolean) => void;
}) {
  return (
    <section className="space-y-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Practice library</p>
          <h1 className="page-title">Questions</h1>
          <p className="mt-2 text-sm text-(--muted)">
            {solvedCount} of {total} questions solved. Keep going.
          </p>
        </div>
        <div className="text-right text-xs text-(--muted)">
          <span className="font-semibold text-(--text)">
            {questions.length}
          </span>{" "}
          matching
        </div>
      </div>
      <div className="panel filter-panel">
        <div className="search-wrap">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by question name or ID"
            aria-label="Search questions"
          />
          {query && (
            <button
              className="clear-search"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div className="filter-row">
          <div className="segmented-control">
            {(["all", "solved", "unsolved"] as Filter[]).map((item) => (
              <button
                key={item}
                className={filter === item ? "selected" : ""}
                onClick={() => setFilter(item)}
              >
                {item[0].toUpperCase() + item.slice(1)}
                {item === "solved" && <span>{solvedCount}</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-(--muted) sm:inline">
              Sort by
            </span>
            <div className="sort-select">
              <ArrowUpDown size={14} />
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                aria-label="Sort questions"
              >
                <option value="asc">ID ascending</option>
                <option value="desc">ID descending</option>
                <option value="alpha">Alphabetical</option>
              </select>
            </div>
          </div>
        </div>
        <div className="action-row">
          <button className="soft-button" onClick={() => onBulk(true)}>
            <CheckCheck size={15} />
            Mark visible solved
          </button>
          <button className="soft-button" onClick={() => onBulk(false)}>
            <ArrowDownAZ size={15} />
            Unmark visible
          </button>
        </div>
      </div>
      {questions.length ? (
        <div className="question-list">
          {questions.map((question) => (
            <QuestionRow
              key={question.id}
              question={question}
              solved={solvedSet.has(question.id)}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Search size={24} />
          <h2>No questions found</h2>
          <p>Try a different search or filter.</p>
          <button
            className="text-button"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
          >
            Clear filters <X size={14} />
          </button>
        </div>
      )}
    </section>
  );
}

function QuestionRow({
  question,
  solved,
  onToggle,
}: {
  question: Question;
  solved: boolean;
  onToggle: (id: number) => void;
}) {
  return (
    <label className={`question-row ${solved ? "is-solved" : ""}`}>
      <input
        type="checkbox"
        checked={solved}
        onChange={() => onToggle(question.id)}
        aria-label={`Mark ${question.questionName} as ${solved ? "unsolved" : "solved"}`}
      />
      <span className="custom-check">
        {solved && <Check size={14} strokeWidth={3} />}
      </span>
      <span className="question-id">
        #{String(question.id).padStart(3, "0")}
      </span>
      <span className="question-name">{question.questionName}</span>
      {solved && <span className="solved-label">Solved</span>}
    </label>
  );
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-modal="true">
        <div className="dialog-icon">
          <RotateCcw size={19} />
        </div>
        <h2>{title}</h2>
        <p>{body}</p>
        <div className="dialog-actions">
          <button className="soft-button" onClick={onClose}>
            Cancel
          </button>
          <button className="danger-button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
function ImportDialog({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (file: File) => void;
}) {
  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-modal="true">
        <button
          className="dialog-close"
          onClick={onClose}
          aria-label="Close import dialog"
        >
          <X size={17} />
        </button>
        <div className="dialog-icon import">
          <FileUp size={19} />
        </div>
        <h2>Import progress</h2>
        <p>
          Select a CPulse export file. Existing progress will be replaced only
          after confirmation.
        </p>
        <label className="file-drop">
          <FileUp size={20} />
          <span>Choose JSON export</span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImport(file);
            }}
          />
        </label>
        <button className="soft-button mt-3 w-full" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default App;
