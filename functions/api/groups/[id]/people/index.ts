import { badRequest, type Env, groupExists, json, notFound } from "../../../_utils";

export const onRequestPost: PagesFunction<Env, "id"> = async ({ env, params, request }) => {
	const groupId = params.id as string;
	if (!(await groupExists(env.DB, groupId))) return notFound("group not found");

	const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
	const name = typeof body?.name === "string" ? body.name.trim() : "";
	if (!name) return badRequest("name is required");

	const existing = await env.DB.prepare("SELECT 1 AS ok FROM people WHERE group_id = ? AND LOWER(name) = LOWER(?)")
		.bind(groupId, name)
		.first();
	if (existing) return badRequest("person with that name already exists");

	const id = crypto.randomUUID();
	await env.DB.prepare("INSERT INTO people (id, group_id, name) VALUES (?, ?, ?)").bind(id, groupId, name).run();

	return json({ id, name }, { status: 201 });
};
