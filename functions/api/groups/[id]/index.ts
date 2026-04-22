import { type Env, json, loadGroup, notFound } from "../../_utils";

export const onRequestGet: PagesFunction<Env, "id"> = async ({ env, params }) => {
	const groupId = params.id as string;
	const state = await loadGroup(env.SPLITWISE, groupId);
	if (!state) return notFound("group not found");
	return json(state);
};
