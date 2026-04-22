import { badRequest, type Env, json, loadGroup, notFound, saveGroup } from "../../../_utils";

export const onRequestPost: PagesFunction<Env, "id"> = async ({ env, params, request }) => {
	const groupId = params.id as string;
	const state = await loadGroup(env.SPLITWISE, groupId);
	if (!state) return notFound("group not found");

	const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
	const name = typeof body?.name === "string" ? body.name.trim() : "";
	if (!name) return badRequest("name is required");
	if (state.people.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
		return badRequest("person with that name already exists");
	}

	const person = { id: crypto.randomUUID(), name };
	state.people.push(person);
	await saveGroup(env.SPLITWISE, groupId, state);
	return json(person, { status: 201 });
};
