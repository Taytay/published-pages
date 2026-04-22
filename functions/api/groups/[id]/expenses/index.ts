import { badRequest, type Env, type Expense, json, loadGroup, notFound, type Split, saveGroup } from "../../../_utils";

function validateSplits(raw: unknown): Split[] | null {
	if (!Array.isArray(raw) || raw.length === 0) return null;
	const result: Split[] = [];
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
	const state = await loadGroup(env.SPLITWISE, groupId);
	if (!state) return notFound("group not found");

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
	await saveGroup(env.SPLITWISE, groupId, state);
	return json(expense, { status: 201 });
};
