import { badRequest, type Env, groupExists, json, notFound } from "../../../_utils";

type SplitInput = { personId: string; amount: number };
type ExpenseInput = {
	description?: unknown;
	amount?: unknown;
	payerId?: unknown;
	splits?: unknown;
};

function validateSplits(raw: unknown): SplitInput[] | null {
	if (!Array.isArray(raw) || raw.length === 0) return null;
	const result: SplitInput[] = [];
	for (const s of raw) {
		if (!s || typeof s !== "object") return null;
		const personId = (s as { personId?: unknown }).personId;
		const amount = (s as { amount?: unknown }).amount;
		if (typeof personId !== "string" || typeof amount !== "number" || !Number.isFinite(amount)) return null;
		result.push({ personId, amount });
	}
	return result;
}

export const onRequestPost: PagesFunction<Env, "id"> = async ({ env, params, request }) => {
	const groupId = params.id as string;
	if (!(await groupExists(env.DB, groupId))) return notFound("group not found");

	const body = (await request.json().catch(() => null)) as ExpenseInput | null;
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

	const peopleRows = await env.DB.prepare("SELECT id FROM people WHERE group_id = ?")
		.bind(groupId)
		.all<{ id: string }>();
	const validIds = new Set(peopleRows.results.map((r) => r.id));
	if (!validIds.has(payerId)) return badRequest("payerId does not belong to this group");
	for (const s of splits) {
		if (!validIds.has(s.personId)) return badRequest("split personId does not belong to this group");
	}

	const id = crypto.randomUUID();
	const createdAt = Date.now();

	const statements = [
		env.DB.prepare(
			"INSERT INTO expenses (id, group_id, description, amount, payer_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		).bind(id, groupId, description, amount, payerId, createdAt),
		...splits.map((s) =>
			env.DB.prepare("INSERT INTO splits (expense_id, person_id, amount) VALUES (?, ?, ?)").bind(
				id,
				s.personId,
				s.amount,
			),
		),
	];
	await env.DB.batch(statements);

	return json(
		{
			id,
			description,
			amount,
			payerId,
			createdAt,
			splits,
		},
		{ status: 201 },
	);
};
