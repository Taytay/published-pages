import { type Env, json, loadGroup, notFound, saveGroup } from "../../../_utils";

export const onRequestDelete: PagesFunction<Env, "id" | "expenseId"> = async ({ env, params }) => {
	const groupId = params.id as string;
	const expenseId = params.expenseId as string;
	const state = await loadGroup(env.SPLITWISE, groupId);
	if (!state) return notFound("group not found");

	state.expenses = state.expenses.filter((e) => e.id !== expenseId);
	await saveGroup(env.SPLITWISE, groupId, state);
	return json({ ok: true });
};
