export type Env = {
	SPLITWISE: KVNamespace;
};

export type Person = { id: string; name: string };
export type Split = { personId: string; amount: number };
export type Expense = {
	id: string;
	description: string;
	amount: number;
	payerId: string;
	splits: Split[];
	createdAt: number;
};
export type GroupState = {
	people: Person[];
	expenses: Expense[];
};

function groupKey(id: string): string {
	return `group:${id}`;
}

export async function loadGroup(kv: KVNamespace, id: string): Promise<GroupState | null> {
	return await kv.get<GroupState>(groupKey(id), "json");
}

export async function saveGroup(kv: KVNamespace, id: string, state: GroupState): Promise<void> {
	await kv.put(groupKey(id), JSON.stringify(state));
}

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
