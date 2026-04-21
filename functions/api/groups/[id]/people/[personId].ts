import { type Env, json } from "../../../_utils";

export const onRequestDelete: PagesFunction<Env, "id" | "personId"> = async ({ env, params }) => {
	const groupId = params.id as string;
	const personId = params.personId as string;
	await env.DB.prepare("DELETE FROM people WHERE id = ? AND group_id = ?").bind(personId, groupId).run();
	return json({ ok: true });
};
