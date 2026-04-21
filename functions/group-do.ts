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

type GroupState = {
	people: Person[];
	expenses: Expense[];
};

const STATE_KEY = "state";

function json(data: unknown, init: ResponseInit = {}): Response {
	return new Response(JSON.stringify(data), {
		...init,
		headers: { "content-type": "application/json; charset=utf-8", ...init.headers },
	});
}

function badRequest(message: string): Response {
	return json({ error: message }, { status: 400 });
}

function notFound(message = "not found"): Response {
	return json({ error: message }, { status: 404 });
}

function validateSplits(raw: unknown): Split[] | null {
	if (!Array.isArray(raw) || raw.length === 0) return null;
	const out: Split[] = [];
	for (const s of raw) {
		if (!s || typeof s !== "object") return null;
		const personId = (s as { personId?: unknown }).personId;
		const amount = (s as { amount?: unknown }).amount;
		if (typeof personId !== "string" || typeof amount !== "number" || !Number.isFinite(amount)) return null;
		out.push({ personId, amount });
	}
	return out;
}

export class GroupDO implements DurableObject {
	private ctx: DurableObjectState;

	constructor(ctx: DurableObjectState) {
		this.ctx = ctx;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const segments = url.pathname.split("/").filter(Boolean);
		const [first, second] = segments;
		const { method } = request;

		if (method === "POST" && first === "init") {
			const existing = await this.ctx.storage.get<GroupState>(STATE_KEY);
			if (!existing) {
				await this.ctx.storage.put<GroupState>(STATE_KEY, { people: [], expenses: [] });
			}
			return json({ ok: true });
		}

		const state = await this.ctx.storage.get<GroupState>(STATE_KEY);
		if (!state) return notFound("group not found");

		if (method === "GET" && (segments.length === 0 || first === "read")) {
			return json(state);
		}

		if (first === "people") {
			if (method === "POST" && !second) return this.addPerson(state, request);
			if (method === "DELETE" && second) return this.removePerson(state, second);
		}

		if (first === "expenses") {
			if (method === "POST" && !second) return this.addExpense(state, request);
			if (method === "DELETE" && second) return this.removeExpense(state, second);
		}

		return notFound();
	}

	private async addPerson(state: GroupState, request: Request): Promise<Response> {
		const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
		const name = typeof body?.name === "string" ? body.name.trim() : "";
		if (!name) return badRequest("name is required");
		if (state.people.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
			return badRequest("person with that name already exists");
		}
		const person: Person = { id: crypto.randomUUID(), name };
		state.people.push(person);
		await this.ctx.storage.put(STATE_KEY, state);
		return json(person, { status: 201 });
	}

	private async removePerson(state: GroupState, personId: string): Promise<Response> {
		state.people = state.people.filter((p) => p.id !== personId);
		await this.ctx.storage.put(STATE_KEY, state);
		return json({ ok: true });
	}

	private async addExpense(state: GroupState, request: Request): Promise<Response> {
		const body = (await request.json().catch(() => null)) as {
			description?: unknown;
			amount?: unknown;
			payerId?: unknown;
			splits?: unknown;
		} | null;
		if (!body) return badRequest("invalid JSON");

		const description = typeof body.description === "string" ? body.description.trim() : "";
		const amount =
			typeof body.amount === "number" && Number.isFinite(body.amount) && body.amount > 0 ? body.amount : null;
		const payerId = typeof body.payerId === "string" ? body.payerId : "";
		const splits = validateSplits(body.splits);

		if (!description) return badRequest("description is required");
		if (amount == null) return badRequest("amount must be a positive number");
		if (!payerId) return badRequest("payerId is required");
		if (!splits) return badRequest("splits must be a non-empty array");

		const validIds = new Set(state.people.map((p) => p.id));
		if (!validIds.has(payerId)) return badRequest("payerId does not belong to this group");
		for (const s of splits) {
			if (!validIds.has(s.personId)) return badRequest("split personId does not belong to this group");
		}

		const expense: Expense = {
			id: crypto.randomUUID(),
			description,
			amount,
			payerId,
			splits,
			createdAt: Date.now(),
		};
		state.expenses.push(expense);
		await this.ctx.storage.put(STATE_KEY, state);
		return json(expense, { status: 201 });
	}

	private async removeExpense(state: GroupState, expenseId: string): Promise<Response> {
		state.expenses = state.expenses.filter((e) => e.id !== expenseId);
		await this.ctx.storage.put(STATE_KEY, state);
		return json({ ok: true });
	}
}
