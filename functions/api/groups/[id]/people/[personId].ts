import { type Env, json, loadGroup, notFound, saveGroup } from "../../../_utils";

export const onRequestDelete: PagesFunction<Env, "id" | "personId"> = async ({ env, params }) => {
	const groupId = params.id as string;
	const personId = params.personId as string;
	const state = await loadGroup(env.SPLITWISE, groupId);
	if (!state) return notFound("group not found");

	state.people = state.people.filter((p) => p.id !== personId);
	await saveGroup(env.SPLITWISE, groupId, state);
	return json({ ok: true });
};
