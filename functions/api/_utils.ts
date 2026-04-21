export type Env = {
	DB: D1Database;
};

export function json(data: unknown, init: ResponseInit = {}): Response {
	return new Response(JSON.stringify(data), {
		...init,
		headers: {
			"content-type": "application/json; charset=utf-8",
			...init.headers,
		},
	});
}

export function badRequest(message: string): Response {
	return json({ error: message }, { status: 400 });
}

export function notFound(message = "not found"): Response {
	return json({ error: message }, { status: 404 });
}

export async function groupExists(db: D1Database, groupId: string): Promise<boolean> {
	const row = await db.prepare("SELECT 1 AS ok FROM groups WHERE id = ?").bind(groupId).first();
	return row != null;
}
