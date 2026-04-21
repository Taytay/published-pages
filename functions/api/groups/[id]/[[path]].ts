import type { Env } from "../../_utils";

export const onRequest: PagesFunction<Env, "id" | "path"> = async ({ env, params, request }) => {
	const groupId = params.id as string;
	const rawPath = params.path;
	const pathSegments = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : [];
	const doPath = pathSegments.length === 0 ? "read" : pathSegments.join("/");

	const stub = env.GROUPS.get(env.GROUPS.idFromName(groupId));
	const doRequest = new Request(`https://do/${doPath}`, request);
	return stub.fetch(doRequest);
};
