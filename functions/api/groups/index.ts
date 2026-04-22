import { type Env, json, saveGroup } from "../_utils";

export const onRequestPost: PagesFunction<Env> = async ({ env }) => {
	const id = crypto.randomUUID();
	await saveGroup(env.SPLITWISE, id, { people: [], expenses: [] });
	return json({ id }, { status: 201 });
};
