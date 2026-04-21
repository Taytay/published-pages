import { type Env, json } from "../_utils";

export { GroupDO } from "../../group-do";

export const onRequestPost: PagesFunction<Env> = async ({ env }) => {
	const id = crypto.randomUUID();
	const stub = env.GROUPS.get(env.GROUPS.idFromName(id));
	const res = await stub.fetch("https://do/init", { method: "POST" });
	if (!res.ok) return res;
	return json({ id }, { status: 201 });
};
