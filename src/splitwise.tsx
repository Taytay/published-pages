import { ArrowRight, Check, Copy, Plus, Receipt, Trash2, Users, X } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./splitwise.css";

type Person = { id: string; name: string };
type Split = { personId: string; amount: number };
type Expense = {
	id: string;
	description: string;
	amount: number;
	payerId: string;
	splits: Split[];
	createdAt: number;
};

type SplitMode = "equal" | "exact" | "shares";

type GroupData = { people: Person[]; expenses: Expense[] };

const API_BASE = "/api";

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`, {
		...init,
		headers: {
			"content-type": "application/json",
			...init?.headers,
		},
	});
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as { error?: string } | null;
		throw new Error(body?.error ?? `Request failed: ${res.status}`);
	}
	return (await res.json()) as T;
}

function useHashGroupId(): [string | null, (id: string | null) => void] {
	const [groupId, setGroupId] = useState<string | null>(() => {
		const h = window.location.hash.replace(/^#/, "");
		return h || null;
	});

	useEffect(() => {
		const onHash = () => {
			const h = window.location.hash.replace(/^#/, "");
			setGroupId(h || null);
		};
		window.addEventListener("hashchange", onHash);
		return () => window.removeEventListener("hashchange", onHash);
	}, []);

	const update = useCallback((id: string | null) => {
		if (id) {
			window.location.hash = id;
		} else {
			history.replaceState(null, "", window.location.pathname + window.location.search);
		}
		setGroupId(id);
	}, []);

	return [groupId, update];
}

export default function SplitwiseApp() {
	const [groupId, setGroupId] = useHashGroupId();

	if (!groupId) {
		return <Landing onCreated={(id) => setGroupId(id)} />;
	}

	return <GroupView groupId={groupId} onLeave={() => setGroupId(null)} />;
}

function Landing({ onCreated }: { onCreated: (id: string) => void }) {
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const create = async () => {
		setCreating(true);
		setError(null);
		try {
			const data = await apiJson<{ id: string }>("/groups", { method: "POST" });
			onCreated(data.id);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create group");
			setCreating(false);
		}
	};

	return (
		<div className="min-h-screen bg-slate-50 text-slate-900">
			<div className="max-w-xl mx-auto p-4 sm:p-6">
				<header className="mb-6">
					<a href="index.html" className="text-sm text-slate-500 hover:text-slate-700">
						&larr; All Tools
					</a>
					<h1 className="text-2xl font-bold tracking-tight mt-2">Settle Up</h1>
					<p className="text-sm text-slate-500 mt-1">Track shared expenses and see who owes whom.</p>
				</header>

				<div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
					<p className="text-sm text-slate-600">
						Create a new group to start tracking expenses. You'll get a secret URL you can share with whoever you're
						splitting with — anyone with the link can view and edit.
					</p>
					<button
						type="button"
						onClick={create}
						disabled={creating}
						className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:bg-slate-300"
					>
						{creating ? "Creating…" : "Create new group"}
					</button>
					{error && <div className="text-sm text-rose-600">{error}</div>}
					<p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
						Already have a group? Paste the link in your address bar.
					</p>
				</div>
			</div>
		</div>
	);
}

function GroupView({ groupId, onLeave }: { groupId: string; onLeave: () => void }) {
	const [data, setData] = useState<GroupData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [showAddPerson, setShowAddPerson] = useState(false);
	const [showAddExpense, setShowAddExpense] = useState(false);
	const [newPersonName, setNewPersonName] = useState("");
	const [copied, setCopied] = useState(false);

	const load = useCallback(async () => {
		try {
			const fresh = await apiJson<GroupData>(`/groups/${encodeURIComponent(groupId)}`);
			setData(fresh);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load group");
		}
	}, [groupId]);

	useEffect(() => {
		setData(null);
		load();
	}, [load]);

	const addPerson = async () => {
		const name = newPersonName.trim();
		if (!name || !data) return;
		if (data.people.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
			setShowAddPerson(false);
			setNewPersonName("");
			return;
		}
		try {
			const created = await apiJson<Person>(`/groups/${encodeURIComponent(groupId)}/people`, {
				method: "POST",
				body: JSON.stringify({ name }),
			});
			setData({ ...data, people: [...data.people, created] });
			setNewPersonName("");
			setShowAddPerson(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to add person");
		}
	};

	const removePerson = async (id: string) => {
		if (!data) return;
		if (data.expenses.some((e) => e.payerId === id || e.splits.some((s) => s.personId === id))) {
			if (!confirm("This person is in existing expenses. Remove anyway? (expenses referencing them will break)")) {
				return;
			}
		}
		const prev = data;
		setData({ ...data, people: data.people.filter((p) => p.id !== id) });
		try {
			await apiJson(`/groups/${encodeURIComponent(groupId)}/people/${encodeURIComponent(id)}`, { method: "DELETE" });
		} catch (err) {
			setData(prev);
			setError(err instanceof Error ? err.message : "Failed to remove person");
		}
	};

	const addExpense = async (expense: Omit<Expense, "id" | "createdAt">) => {
		if (!data) return;
		try {
			const created = await apiJson<Expense>(`/groups/${encodeURIComponent(groupId)}/expenses`, {
				method: "POST",
				body: JSON.stringify(expense),
			});
			setData({ ...data, expenses: [...data.expenses, created] });
			setShowAddExpense(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to add expense");
		}
	};

	const removeExpense = async (id: string) => {
		if (!data) return;
		const prev = data;
		setData({ ...data, expenses: data.expenses.filter((e) => e.id !== id) });
		try {
			await apiJson(`/groups/${encodeURIComponent(groupId)}/expenses/${encodeURIComponent(id)}`, { method: "DELETE" });
		} catch (err) {
			setData(prev);
			setError(err instanceof Error ? err.message : "Failed to remove expense");
		}
	};

	const copyLink = async () => {
		try {
			await navigator.clipboard.writeText(window.location.href);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			/* clipboard unavailable — ignore */
		}
	};

	if (!data && !error) {
		return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading…</div>;
	}

	if (!data) {
		return (
			<div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 gap-4">
				<div className="text-sm text-rose-600">{error}</div>
				<button
					type="button"
					onClick={onLeave}
					className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
				>
					Back to start
				</button>
			</div>
		);
	}

	const { people, expenses } = data;

	const balances: Record<string, number> = {};
	for (const p of people) {
		balances[p.id] = 0;
	}
	for (const exp of expenses) {
		const payerBal = balances[exp.payerId];
		if (payerBal !== undefined) balances[exp.payerId] = payerBal + exp.amount;
		for (const s of exp.splits) {
			const bal = balances[s.personId];
			if (bal !== undefined) balances[s.personId] = bal - s.amount;
		}
	}

	const settlements = (() => {
		const creditors: { id: string; amount: number }[] = [];
		const debtors: { id: string; amount: number }[] = [];
		for (const [id, bal] of Object.entries(balances)) {
			const cents = Math.round(bal * 100);
			if (cents > 0) creditors.push({ id, amount: cents });
			else if (cents < 0) debtors.push({ id, amount: -cents });
		}
		creditors.sort((a, b) => b.amount - a.amount);
		debtors.sort((a, b) => b.amount - a.amount);

		const result: { from: string; to: string; amount: number }[] = [];
		let i = 0;
		let j = 0;
		while (i < debtors.length && j < creditors.length) {
			const debtor = debtors[i];
			const creditor = creditors[j];
			if (!debtor || !creditor) break;
			const pay = Math.min(debtor.amount, creditor.amount);
			result.push({ from: debtor.id, to: creditor.id, amount: pay / 100 });
			debtor.amount -= pay;
			creditor.amount -= pay;
			if (debtor.amount === 0) i++;
			if (creditor.amount === 0) j++;
		}
		return result;
	})();

	const nameOf = (id: string) => people.find((p) => p.id === id)?.name || "?";
	const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

	return (
		<div className="min-h-screen bg-slate-50 text-slate-900">
			<div className="max-w-3xl mx-auto p-4 sm:p-6">
				<header className="mb-6">
					<a href="index.html" className="text-sm text-slate-500 hover:text-slate-700">
						&larr; All Tools
					</a>
					<div className="flex items-start justify-between mt-2 gap-3">
						<div>
							<h1 className="text-2xl font-bold tracking-tight">Settle Up</h1>
							<p className="text-sm text-slate-500 mt-1">Share this page's URL to collaborate on the group.</p>
						</div>
						<button
							type="button"
							onClick={copyLink}
							className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium flex-shrink-0 mt-1"
						>
							<Copy size={14} /> {copied ? "Copied!" : "Copy link"}
						</button>
					</div>
				</header>

				{error && (
					<div className="mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
						{error}
					</div>
				)}

				<div className="grid grid-cols-3 gap-3 mb-6">
					<div className="bg-white rounded-lg border border-slate-200 p-3">
						<div className="text-xs text-slate-500 uppercase tracking-wide">People</div>
						<div className="text-2xl font-semibold mt-1">{people.length}</div>
					</div>
					<div className="bg-white rounded-lg border border-slate-200 p-3">
						<div className="text-xs text-slate-500 uppercase tracking-wide">Expenses</div>
						<div className="text-2xl font-semibold mt-1">{expenses.length}</div>
					</div>
					<div className="bg-white rounded-lg border border-slate-200 p-3">
						<div className="text-xs text-slate-500 uppercase tracking-wide">Total</div>
						<div className="text-2xl font-semibold mt-1">${totalSpent.toFixed(2)}</div>
					</div>
				</div>

				<section className="mb-6">
					<div className="flex items-center justify-between mb-2">
						<h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-2">
							<Users size={14} /> People
						</h2>
						<button
							type="button"
							onClick={() => setShowAddPerson(true)}
							className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
						>
							<Plus size={14} /> Add
						</button>
					</div>
					{people.length === 0 ? (
						<div className="bg-white border border-dashed border-slate-300 rounded-lg p-6 text-center text-sm text-slate-500">
							Add people to start splitting expenses.
						</div>
					) : (
						<div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
							{people.map((p) => {
								const bal = balances[p.id] || 0;
								const balClass =
									Math.abs(bal) < 0.005 ? "text-slate-400" : bal > 0 ? "text-emerald-600" : "text-rose-600";
								return (
									<div key={p.id} className="flex items-center justify-between px-4 py-3">
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold">
												{p.name[0]?.toUpperCase() ?? "?"}
											</div>
											<span className="font-medium">{p.name}</span>
										</div>
										<div className="flex items-center gap-3">
											<span className={`text-sm tabular-nums ${balClass}`}>
												{Math.abs(bal) < 0.005
													? "settled"
													: bal > 0
														? `+$${bal.toFixed(2)}`
														: `-$${Math.abs(bal).toFixed(2)}`}
											</span>
											<button
												type="button"
												onClick={() => removePerson(p.id)}
												className="text-slate-400 hover:text-rose-600"
												aria-label={`Remove ${p.name}`}
											>
												<Trash2 size={16} />
											</button>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</section>

				<section className="mb-6">
					<div className="flex items-center justify-between mb-2">
						<h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-2">
							<Receipt size={14} /> Expenses
						</h2>
						<button
							type="button"
							onClick={() => setShowAddExpense(true)}
							disabled={people.length < 2}
							className="text-sm text-indigo-600 hover:text-indigo-700 disabled:text-slate-300 font-medium flex items-center gap-1"
						>
							<Plus size={14} /> Add
						</button>
					</div>
					{expenses.length === 0 ? (
						<div className="bg-white border border-dashed border-slate-300 rounded-lg p-6 text-center text-sm text-slate-500">
							{people.length < 2 ? "Add at least two people first." : "No expenses yet."}
						</div>
					) : (
						<div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
							{[...expenses].reverse().map((e) => (
								<div key={e.id} className="px-4 py-3">
									<div className="flex items-center justify-between">
										<div className="min-w-0">
											<div className="font-medium truncate">{e.description}</div>
											<div className="text-xs text-slate-500 mt-0.5">
												{nameOf(e.payerId)} paid · split between {e.splits.length}{" "}
												{e.splits.length === 1 ? "person" : "people"}
											</div>
										</div>
										<div className="flex items-center gap-3 flex-shrink-0 ml-3">
											<span className="font-semibold tabular-nums">${e.amount.toFixed(2)}</span>
											<button
												type="button"
												onClick={() => removeExpense(e.id)}
												className="text-slate-400 hover:text-rose-600"
												aria-label={`Remove ${e.description}`}
											>
												<Trash2 size={16} />
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</section>

				<section>
					<h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 mb-2">Settle Up</h2>
					{settlements.length === 0 ? (
						<div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-sm text-slate-500">
							{expenses.length === 0 ? "Nothing to settle yet." : "Everyone is settled up."}
						</div>
					) : (
						<div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
							{settlements.map((s) => (
								<div key={`${s.from}-${s.to}`} className="px-4 py-3 flex items-center gap-3">
									<span className="font-medium">{nameOf(s.from)}</span>
									<ArrowRight size={16} className="text-slate-400" />
									<span className="font-medium">{nameOf(s.to)}</span>
									<span className="ml-auto font-semibold tabular-nums text-indigo-600">${s.amount.toFixed(2)}</span>
								</div>
							))}
						</div>
					)}
				</section>
			</div>

			{showAddPerson && (
				<Modal
					onClose={() => {
						setShowAddPerson(false);
						setNewPersonName("");
					}}
					title="Add Person"
				>
					<input
						// biome-ignore lint/a11y/noAutofocus: modal input should take focus on open
						autoFocus
						value={newPersonName}
						onChange={(ev) => setNewPersonName(ev.target.value)}
						onKeyDown={(ev) => {
							if (ev.key === "Enter") addPerson();
						}}
						placeholder="Name"
						className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
					/>
					<div className="flex gap-2 mt-4">
						<button
							type="button"
							onClick={() => {
								setShowAddPerson(false);
								setNewPersonName("");
							}}
							className="flex-1 px-4 py-2 border border-slate-300 rounded-md text-sm font-medium hover:bg-slate-50"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={addPerson}
							className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
						>
							Add
						</button>
					</div>
				</Modal>
			)}

			{showAddExpense && <ExpenseModal people={people} onClose={() => setShowAddExpense(false)} onSave={addExpense} />}
		</div>
	);
}

function Modal({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: click-outside overlay
		// biome-ignore lint/a11y/useKeyWithClickEvents: click-outside overlay
		<div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: stop-propagation container */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: stop-propagation container */}
			<div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
				<div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
					<h3 className="font-semibold">{title}</h3>
					<button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
						<X size={18} />
					</button>
				</div>
				<div className="p-5">{children}</div>
			</div>
		</div>
	);
}

type ExpenseModalProps = {
	people: Person[];
	onClose: () => void;
	onSave: (expense: Omit<Expense, "id" | "createdAt">) => void;
};

type SplitResult = Split[] | { error: string };

function ExpenseModal({ people, onClose, onSave }: ExpenseModalProps) {
	const [description, setDescription] = useState("");
	const [amount, setAmount] = useState("");
	const [payerId, setPayerId] = useState(people[0]?.id ?? "");
	const [mode, setMode] = useState<SplitMode>("equal");
	const [included, setIncluded] = useState<Set<string>>(() => new Set(people.map((p) => p.id)));
	const [exact, setExact] = useState<Record<string, string>>({});
	const [shares, setShares] = useState<Record<string, string>>(() =>
		Object.fromEntries(people.map((p) => [p.id, "1"])),
	);

	const toggle = (id: string) => {
		const n = new Set(included);
		if (n.has(id)) n.delete(id);
		else n.add(id);
		setIncluded(n);
	};

	const amt = Number.parseFloat(amount) || 0;

	const computeSplits = (): SplitResult | null => {
		const inc = people.filter((p) => included.has(p.id));
		if (inc.length === 0 || amt <= 0) return null;

		if (mode === "equal") {
			const totalCents = Math.round(amt * 100);
			const base = Math.floor(totalCents / inc.length);
			const rem = totalCents - base * inc.length;
			return inc.map((p, i) => ({
				personId: p.id,
				amount: (base + (i < rem ? 1 : 0)) / 100,
			}));
		}
		if (mode === "exact") {
			const splits = inc.map((p) => ({
				personId: p.id,
				amount: Number.parseFloat(exact[p.id] ?? "") || 0,
			}));
			const sum = splits.reduce((s, x) => s + x.amount, 0);
			if (Math.abs(sum - amt) > 0.01) {
				return { error: `Splits sum to $${sum.toFixed(2)}, expected $${amt.toFixed(2)}` };
			}
			return splits;
		}
		if (mode === "shares") {
			const totalShares = inc.reduce((s, p) => s + (Number.parseFloat(shares[p.id] ?? "") || 0), 0);
			if (totalShares <= 0) return { error: "Shares must sum to more than 0" };
			const totalCents = Math.round(amt * 100);
			let assigned = 0;
			const splits = inc.map((p, i) => {
				let cents: number;
				if (i === inc.length - 1) {
					cents = totalCents - assigned;
				} else {
					cents = Math.round(((Number.parseFloat(shares[p.id] ?? "") || 0) / totalShares) * totalCents);
					assigned += cents;
				}
				return { personId: p.id, amount: cents / 100 };
			});
			return splits;
		}
		return null;
	};

	const splits = computeSplits();
	const error = splits && !Array.isArray(splits) ? splits.error : undefined;
	const validSplits = Array.isArray(splits) ? splits : null;
	const valid = description.trim() && amt > 0 && payerId && validSplits && !error;

	const handleSave = () => {
		if (!valid || !validSplits) return;
		onSave({
			description: description.trim(),
			amount: amt,
			payerId,
			splits: validSplits,
		});
	};

	return (
		<Modal onClose={onClose} title="Add Expense">
			<div className="space-y-3">
				<div>
					<label htmlFor="expense-description" className="block text-xs font-medium text-slate-600 mb-1">
						Description
					</label>
					<input
						id="expense-description"
						// biome-ignore lint/a11y/noAutofocus: modal input should take focus on open
						autoFocus
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="e.g. Dinner at Luigi's"
						className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<div>
						<label htmlFor="expense-amount" className="block text-xs font-medium text-slate-600 mb-1">
							Amount
						</label>
						<input
							id="expense-amount"
							type="number"
							step="0.01"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							placeholder="0.00"
							className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
						/>
					</div>
					<div>
						<label htmlFor="expense-payer" className="block text-xs font-medium text-slate-600 mb-1">
							Paid by
						</label>
						<select
							id="expense-payer"
							value={payerId}
							onChange={(e) => setPayerId(e.target.value)}
							className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
						>
							{people.map((p) => (
								<option key={p.id} value={p.id}>
									{p.name}
								</option>
							))}
						</select>
					</div>
				</div>

				<div>
					<div className="block text-xs font-medium text-slate-600 mb-1">Split</div>
					<div className="flex gap-1 bg-slate-100 p-1 rounded-md">
						{(
							[
								["equal", "Equal"],
								["exact", "Exact"],
								["shares", "Shares"],
							] as const
						).map(([k, label]) => (
							<button
								type="button"
								key={k}
								onClick={() => setMode(k)}
								className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
									mode === k ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"
								}`}
							>
								{label}
							</button>
						))}
					</div>
				</div>

				<div className="border border-slate-200 rounded-md divide-y divide-slate-100 max-h-60 overflow-y-auto">
					{people.map((p) => {
						const isIncluded = included.has(p.id);
						return (
							<div key={p.id} className="flex items-center gap-3 px-3 py-2">
								<button
									type="button"
									onClick={() => toggle(p.id)}
									className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
										isIncluded ? "bg-indigo-600 border-indigo-600" : "border-slate-300"
									}`}
									aria-label={isIncluded ? `Exclude ${p.name}` : `Include ${p.name}`}
								>
									{isIncluded && <Check size={12} className="text-white" />}
								</button>
								<span className={`flex-1 text-sm ${!isIncluded ? "text-slate-400" : ""}`}>{p.name}</span>
								{isIncluded && mode === "exact" && (
									<input
										type="number"
										step="0.01"
										value={exact[p.id] ?? ""}
										onChange={(e) => setExact({ ...exact, [p.id]: e.target.value })}
										placeholder="0.00"
										className="w-20 px-2 py-1 border border-slate-300 rounded text-sm text-right"
										aria-label={`${p.name} exact amount`}
									/>
								)}
								{isIncluded && mode === "shares" && (
									<input
										type="number"
										step="1"
										value={shares[p.id] ?? ""}
										onChange={(e) => setShares({ ...shares, [p.id]: e.target.value })}
										placeholder="1"
										className="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-right"
										aria-label={`${p.name} shares`}
									/>
								)}
								{isIncluded && mode === "equal" && validSplits && (
									<span className="text-sm text-slate-500 tabular-nums">
										${validSplits.find((s) => s.personId === p.id)?.amount.toFixed(2) || "0.00"}
									</span>
								)}
							</div>
						);
					})}
				</div>

				{error && <div className="text-sm text-rose-600">{error}</div>}

				<div className="flex gap-2 pt-2">
					<button
						type="button"
						onClick={onClose}
						className="flex-1 px-4 py-2 border border-slate-300 rounded-md text-sm font-medium hover:bg-slate-50"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleSave}
						disabled={!valid}
						className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:bg-slate-300"
					>
						Save
					</button>
				</div>
			</div>
		</Modal>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(<SplitwiseApp />);
}
