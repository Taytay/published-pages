import { type Env, json } from "../../../_utils";

export const onRequestDelete: PagesFunction<Env, "id" | "expenseId"> = async ({ env, params }) => {
	const groupId = params.id as string;
	const expenseId = params.expenseId as string;
	await env.DB.prepare("DELETE FROM expenses WHERE id = ? AND group_id = ?").bind(expenseId, groupId).run();
	return json({ ok: true });
};
