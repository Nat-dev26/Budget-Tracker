import { useState, useMemo, useEffect } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  Plus,
  Trash2,
  UtensilsCrossed,
  Coffee,
  Car,
  MoreHorizontal,
  Wallet,
  History,
  ListChecks,
  LogOut,
} from "lucide-react";
import { auth, db } from "./firebase";
import Auth from "./auth";
import "./App.css";

const CATEGORIES = [
  { id: "food", label: "Food", icon: UtensilsCrossed },
  { id: "drinks", label: "Drinks", icon: Coffee },
  { id: "transport", label: "Transport", icon: Car },
  { id: "other", label: "Other", icon: MoreHorizontal },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDay(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmt(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Expense = {
  id: number;
  date: string;
  category: string;
  note: string;
  amount: number;
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [view, setView] = useState<"track" | "history">("track");

  const [budget, setBudget] = useState(0);
  const [budgetDraft, setBudgetDraft] = useState("0");
  const [editingBudget, setEditingBudget] = useState(false);

  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());

  // watch login state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      setDataLoaded(false);
    });
    return unsub;
  }, []);

  // load this user's data from Firestore once logged in
  useEffect(() => {
    if (!user) return;
    (async () => {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setBudget(data.budget ?? 0);
        setBudgetDraft(String(data.budget ?? 0));
        setExpenses(data.expenses ?? []);
      } else {
        setBudget(0);
        setExpenses([]);
      }
      setDataLoaded(true);
    })();
  }, [user]);

  // save to Firestore whenever budget/expenses change (after initial load)
  useEffect(() => {
    if (!user || !dataLoaded) return;
    const ref = doc(db, "users", user.uid);
    setDoc(ref, { budget, expenses }, { merge: true }).catch(() => {});
  }, [budget, expenses, user, dataLoaded]);

  const weekTotal = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const remaining = budget - weekTotal;
  const pct = budget > 0 ? Math.min((weekTotal / budget) * 100, 100) : 0;
  const overBudget = budget > 0 && remaining < 0;

  const byDay = useMemo(() => {
    const map: Record<string, Expense[]> = {};
    for (const e of expenses) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [expenses]);

  function categoryTotals(items: Expense[]) {
    const totals: Record<string, number> = {};
    for (const e of items) {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    }
    return CATEGORIES.map((c) => ({ ...c, total: totals[c.id] || 0 })).filter(
      (c) => c.total > 0
    );
  }

  function addExpense() {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    setExpenses((prev) => [
      ...prev,
      { id: Date.now(), date, category, note: note.trim(), amount: val },
    ]);
    setAmount("");
    setNote("");
  }

  function removeExpense(id: number) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  function commitBudget() {
    const val = parseFloat(budgetDraft);
    if (!isNaN(val) && val >= 0) setBudget(val);
    else setBudgetDraft(String(budget));
    setEditingBudget(false);
  }

  if (authLoading) {
    return <div className="bt-loading">Loading...</div>;
  }

  if (!user) {
    return <Auth />;
  }

  if (!dataLoaded) {
    return <div className="bt-loading">Loading your data...</div>;
  }

  return (
    <div className="bt-wrapper">
      <div className="bt-container">
        <div className="bt-header">
          <div className="bt-logo">
            <Wallet size={17} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="bt-title">Weekly ledger</div>
            <div className="bt-subtitle">{user.email}</div>
          </div>
          <button className="bt-logout-btn" onClick={() => signOut(auth)} title="Log out">
            <LogOut size={16} />
          </button>
        </div>

        <div className="bt-tabs">
          <button
            className={`bt-tab ${view === "track" ? "is-active" : ""}`}
            onClick={() => setView("track")}
          >
            <ListChecks size={14} />
            Track
          </button>
          <button
            className={`bt-tab ${view === "history" ? "is-active" : ""}`}
            onClick={() => setView("history")}
          >
            <History size={14} />
            History
          </button>
        </div>

        {view === "track" && (
          <>
            <div className="bt-card">
              <div className="bt-summary-row">
                <div>
                  <div className="bt-label">Spent this week</div>
                  <div className={`bt-amount-big ${overBudget ? "is-over" : ""}`}>
                    ₱{fmt(weekTotal)}
                  </div>
                </div>

                <div className="bt-summary-right">
                  <div className="bt-label">Budget</div>
                  {editingBudget ? (
                    <input
                      autoFocus
                      value={budgetDraft}
                      onChange={(e) => setBudgetDraft(e.target.value)}
                      onBlur={commitBudget}
                      onKeyDown={(e) => e.key === "Enter" && commitBudget()}
                      className="bt-budget-input"
                    />
                  ) : (
                    <button
                      className="bt-budget-display"
                      onClick={() => {
                        setBudgetDraft(String(budget));
                        setEditingBudget(true);
                      }}
                    >
                      ₱{fmt(budget)}
                    </button>
                  )}
                </div>
              </div>

              {budget > 0 && (
                <>
                  <div className="bt-progress-track">
                    <div
                      className={`bt-progress-fill ${overBudget ? "is-over" : ""}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className={`bt-progress-msg ${overBudget ? "is-over" : "is-good"}`}>
                    {overBudget
                      ? `Over budget by ₱${fmt(Math.abs(remaining))}`
                      : `₱${fmt(remaining)} left this week`}
                  </div>
                </>
              )}
            </div>

            <div className="bt-card">
              <div className="bt-label" style={{ marginBottom: 12 }}>
                Add an expense
              </div>

              <div className="bt-form-row">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bt-input"
                />
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bt-input bt-input-mono"
                />
              </div>

              <input
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="bt-input bt-input-full"
              />

              <div className="bt-category-row">
                {CATEGORIES.map((c) => {
                  const Icon = c.icon;
                  const active = category === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={`bt-chip ${active ? "is-active" : ""}`}
                    >
                      <Icon size={13} />
                      {c.label}
                    </button>
                  );
                })}
              </div>

              <button className="bt-add-btn" onClick={addExpense}>
                <Plus size={15} />
                Add expense
              </button>
            </div>

            <div className="bt-section-label">Today & recent days</div>

            {byDay.length === 0 && (
              <div className="bt-empty">No expenses logged yet.</div>
            )}

            {byDay.slice(0, 3).map(([d, items]) => (
              <DayCard
                key={d}
                dateISO={d}
                items={items}
                categoryTotals={categoryTotals(items)}
                onRemove={removeExpense}
              />
            ))}
          </>
        )}

        {view === "history" && (
          <>
            <div className="bt-section-label">Full history</div>
            {byDay.length === 0 && (
              <div className="bt-empty">
                Wala ka pang naitatalang gastos. Pumunta sa "Track" tab para magdagdag.
              </div>
            )}
            {byDay.map(([d, items]) => (
              <DayCard
                key={d}
                dateISO={d}
                items={items}
                categoryTotals={categoryTotals(items)}
                onRemove={removeExpense}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function DayCard({
  dateISO,
  items,
  categoryTotals,
  onRemove,
}: {
  dateISO: string;
  items: Expense[];
  categoryTotals: { id: string; label: string; icon: any; total: number }[];
  onRemove: (id: number) => void;
}) {
  const dayTotal = items.reduce((s, e) => s + e.amount, 0);
  return (
    <div className="bt-day-card">
      <div className="bt-day-header">
        <span>{formatDay(dateISO)}</span>
        <span className="bt-mono">₱{fmt(dayTotal)}</span>
      </div>

      <div className="bt-cat-summary">
        {categoryTotals.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.id} className="bt-cat-chip">
              <Icon size={12} />
              <span>{c.label}</span>
              <span className="bt-mono bt-cat-chip-amount">₱{fmt(c.total)}</span>
            </div>
          );
        })}
      </div>

      {items.map((e) => {
        const cat = CATEGORIES.find((c) => c.id === e.category)!;
        const Icon = cat.icon;
        return (
          <div key={e.id} className="bt-expense-row">
            <div className="bt-expense-left">
              <Icon size={14} className="bt-expense-icon" />
              <span>{e.note || cat.label}</span>
            </div>
            <div className="bt-expense-right">
              <span className="bt-mono">₱{fmt(e.amount)}</span>
              <button className="bt-delete-btn" onClick={() => onRemove(e.id)}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default App;