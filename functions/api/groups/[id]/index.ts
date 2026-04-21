import { type Env, groupExists, json, notFound } from "../../_utils";

type PersonRow = { id: string; name: string };
type ExpenseRow = {
	id: string;
	description: string;
	amount: number;
	payer_id: string;
	created_at: number;
};
type SplitRow = { expense_id: string; person_id: string; amount: number };

export const onRequestGet: PagesFunction<Env, "id"> = async ({ env, params }) => {
	const groupId = params.id as string;
	if (!(await groupExists(env.DB, groupId))) return notFound("group not found");

	const peopleResult = await env.DB.prepare("SELECT id, name FROM people WHERE group_id = ? ORDER BY name")
		.bind(groupId)
		.all<PersonRow>();

	const expensesResult = await env.DB.prepare(
		"SELECT id, description, amount, payer_id, created_at FROM expenses WHERE group_id = ? ORDER BY created_at",
	)
		.bind(groupId)
		.all<ExpenseRow>();

	const splitsResult = await env.DB.prepare(
		`SELECT s.expense_id, s.person_id, s.amount
		   FROM splits s
		   JOIN expenses e ON e.id = s.expense_id
		  WHERE e.group_id = ?`,
	)
		.bind(groupId)
		.all<SplitRow>();

	const splitsByExpense = new Map<string, { personId: string; amount: number }[]>();
	for (const s of splitsResult.results) {
		const list = splitsByExpense.get(s.expense_id) ?? [];
		list.push({ personId: s.person_id, amount: s.amount });
		splitsByExpense.set(s.expense_id, list);
	}

	const expenses = expensesResult.results.map((e) => ({
		id: e.id,
		description: e.description,
		amount: e.amount,
		payerId: e.payer_id,
		createdAt: e.created_at,
		splits: splitsByExpense.get(e.id) ?? [],
	}));

	return json({
		people: peopleResult.results,
		expenses,
	});
};
