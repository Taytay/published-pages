import { type Env, json } from "../_utils";

export const onRequestPost: PagesFunction<Env> = async ({ env }) => {
	const id = crypto.randomUUID();
	await env.DB.prepare("INSERT INTO groups (id, created_at) VALUES (?, ?)").bind(id, Date.now()).run();
	return json({ id }, { status: 201 });
};
