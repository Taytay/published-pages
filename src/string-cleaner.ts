export interface CleanOptions {
	nonPrintable?: boolean;
	newlines?: boolean;
	trim?: boolean;
	collapseSpaces?: boolean;
	removeAllWhitespace?: boolean;
	tabs?: boolean;
	urlDecode?: boolean;
	stripHtml?: boolean;
	removeFirstLines?: number | string;
	removeLastLines?: number | string;
	removeFirstChars?: number | string;
	removeLastChars?: number | string;
}

export interface CleanResult {
	text: string;
	urlDecodeError: boolean;
}

export interface DisplayOptions {
	showWhitespace?: boolean;
	showInvisible?: boolean;
}

interface DiffOp {
	type: "equal" | "add" | "remove";
	text: string;
}

interface LinePart {
	text: string;
	newline: string;
}

function toNonNegativeInteger(value: number | string | undefined): number {
	const num = Number(value);
	if (!Number.isFinite(num) || num < 0) {
		return 0;
	}
	return Math.floor(num);
}

function applyLineBoxCleanup(str: string, options: CleanOptions): string {
	const removeFirstLines = toNonNegativeInteger(options.removeFirstLines);
	const removeLastLines = toNonNegativeInteger(options.removeLastLines);
	const removeFirstChars = toNonNegativeInteger(options.removeFirstChars);
	const removeLastChars = toNonNegativeInteger(options.removeLastChars);

	if (!removeFirstLines && !removeLastLines && !removeFirstChars && !removeLastChars) {
		return str;
	}

	let lines = str.split(/\r\n|\r|\n/);

	if (removeFirstLines) {
		lines = lines.slice(removeFirstLines);
	}

	if (removeLastLines) {
		lines = removeLastLines >= lines.length ? [] : lines.slice(0, lines.length - removeLastLines);
	}

	if (removeFirstChars || removeLastChars) {
		lines = lines.map((line) => {
			const trimmedLine = removeFirstChars >= line.length ? "" : line.slice(removeFirstChars);
			if (!removeLastChars) {
				return trimmedLine;
			}
			return removeLastChars >= trimmedLine.length ? "" : trimmedLine.slice(0, trimmedLine.length - removeLastChars);
		});
	}

	return lines.join("\n");
}

function stripHtmlTags(str: string): string {
	let result = "";
	let insideTag = false;

	for (let i = 0; i < str.length; i += 1) {
		if (str.charAt(i) === "<") {
			insideTag = true;
			continue;
		}
		if (str.charAt(i) === ">" && insideTag) {
			insideTag = false;
			continue;
		}
		if (!insideTag) {
			result += str.charAt(i);
		}
	}

	return result;
}

function stripTagBlock(str: string, tagName: string): string {
	let result = str;
	const closeNeedle = `</${tagName}>`;
	let lower = result.toLowerCase();
	const openNeedle = `<${tagName}`;
	let start = lower.indexOf(openNeedle);

	while (start !== -1) {
		const openEnd = lower.indexOf(">", start);
		if (openEnd === -1) {
			return result.slice(0, start);
		}

		const end = lower.indexOf(closeNeedle, openEnd + 1);
		if (end === -1) {
			return result.slice(0, start);
		}

		result = result.slice(0, start) + result.slice(end + closeNeedle.length);
		lower = result.toLowerCase();
		start = lower.indexOf(openNeedle, start);
	}

	return result;
}

export function escapeHtml(str: string): string {
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function isInvisibleCode(code: number): boolean {
	return (code >= 0 && code <= 31) || code === 127 || (code >= 128 && code <= 159);
}

function toHexByte(code: number): string {
	const hex = code.toString(16).toUpperCase();
	return hex.length === 1 ? `0${hex}` : hex;
}

export function visualizeText(str: string, options?: DisplayOptions): string {
	const settings = options ?? {};
	const text = String(str);
	let result = "";

	for (let i = 0; i < text.length; i += 1) {
		const ch = text.charAt(i);
		const code = text.charCodeAt(i);

		if (settings.showWhitespace) {
			if (ch === " ") {
				result += "·";
				continue;
			}
			if (ch === "\t") {
				result += "⇥\t";
				continue;
			}
			if (ch === "\r") {
				result += "␍";
				continue;
			}
			if (ch === "\n") {
				result += "↵\n";
				continue;
			}
		}

		if (settings.showInvisible && ch !== "\t" && ch !== "\r" && ch !== "\n" && isInvisibleCode(code)) {
			result += `\\x${toHexByte(code)}`;
			continue;
		}

		result += ch;
	}

	return result;
}

function buildLineParts(str: string): LinePart[] {
	const text = String(str);
	const parts: LinePart[] = [];
	let start = 0;
	let i = 0;

	while (i < text.length) {
		const ch = text.charAt(i);
		if (ch === "\r" || ch === "\n") {
			const newlineStart = i;
			let newline = ch;
			if (ch === "\r" && text.charAt(i + 1) === "\n") {
				newline = "\r\n";
				i += 1;
			}
			parts.push({
				text: text.slice(start, newlineStart),
				newline,
			});
			start = i + 1;
		}
		i += 1;
	}

	parts.push({
		text: text.slice(start),
		newline: "",
	});

	return parts;
}

function renderNewlineMarker(newline: string, options?: DisplayOptions): string {
	if (!newline || !options?.showWhitespace) {
		return "";
	}
	if (newline === "\r\n") {
		return "␍↵";
	}
	if (newline === "\r") {
		return "␍";
	}
	return "↵";
}

function wrapDiffSpan(type: DiffOp["type"], html: string): string {
	if (!html) {
		return "";
	}
	if (type === "add") {
		return `<span class="diff-added">${html}</span>`;
	}
	if (type === "remove") {
		return `<span class="diff-removed">${html}</span>`;
	}
	return html;
}

function renderTextHtml(str: string, options?: DisplayOptions): string {
	return escapeHtml(visualizeText(str, options));
}

function collapseDiffOps(ops: DiffOp[]): DiffOp[] {
	return ops.reduce<DiffOp[]>((result, op) => {
		const previous = result[result.length - 1];
		if (previous && previous.type === op.type) {
			previous.text += op.text;
		} else if (op.text) {
			result.push({ type: op.type, text: op.text });
		}
		return result;
	}, []);
}

function buildFallbackDiffOps(fromText: string, toText: string): DiffOp[] {
	let start = 0;
	let fromEnd = fromText.length;
	let toEnd = toText.length;
	const ops: DiffOp[] = [];

	while (start < fromEnd && start < toEnd && fromText.charAt(start) === toText.charAt(start)) {
		start += 1;
	}

	while (fromEnd > start && toEnd > start && fromText.charAt(fromEnd - 1) === toText.charAt(toEnd - 1)) {
		fromEnd -= 1;
		toEnd -= 1;
	}

	if (start) {
		ops.push({ type: "equal", text: fromText.slice(0, start) });
	}
	if (fromEnd > start) {
		ops.push({ type: "remove", text: fromText.slice(start, fromEnd) });
	}
	if (toEnd > start) {
		ops.push({ type: "add", text: toText.slice(start, toEnd) });
	}
	if (fromEnd < fromText.length) {
		ops.push({ type: "equal", text: fromText.slice(fromEnd) });
	}

	return ops;
}

function buildDiffOps(fromText: string, toText: string): DiffOp[] {
	const a = String(fromText);
	const b = String(toText);

	if (a === b) {
		return [{ type: "equal", text: a }];
	}

	if (!a) {
		return [{ type: "add", text: b }];
	}

	if (!b) {
		return [{ type: "remove", text: a }];
	}

	if (a.length * b.length > 250000) {
		return buildFallbackDiffOps(a, b);
	}

	// Use a flat array for the LCS matrix to avoid non-null assertions with noUncheckedIndexedAccess
	const rows = a.length + 1;
	const cols = b.length + 1;
	const matrix = new Int32Array(rows * cols);

	const m = (r: number, c: number): number => matrix[r * cols + c] ?? 0;
	const mSet = (r: number, c: number, v: number): void => {
		matrix[r * cols + c] = v;
	};

	for (let i = 1; i <= a.length; i += 1) {
		for (let j = 1; j <= b.length; j += 1) {
			if (a.charAt(i - 1) === b.charAt(j - 1)) {
				mSet(i, j, m(i - 1, j - 1) + 1);
			} else {
				mSet(i, j, m(i - 1, j) >= m(i, j - 1) ? m(i - 1, j) : m(i, j - 1));
			}
		}
	}

	const ops: DiffOp[] = [];
	let i = a.length;
	let j = b.length;

	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && a.charAt(i - 1) === b.charAt(j - 1)) {
			ops.push({ type: "equal", text: a.charAt(i - 1) });
			i -= 1;
			j -= 1;
		} else if (j > 0 && (i === 0 || m(i, j - 1) >= m(i - 1, j))) {
			ops.push({ type: "add", text: b.charAt(j - 1) });
			j -= 1;
		} else {
			ops.push({ type: "remove", text: a.charAt(i - 1) });
			i -= 1;
		}
	}

	return collapseDiffOps(ops.reverse());
}

export function buildDiffHtml(fromText: string, toText: string, options?: DisplayOptions): string {
	return buildDiffOps(fromText, toText)
		.map((op) => wrapDiffSpan(op.type, renderTextHtml(op.text, options)))
		.join("");
}

export function buildDisplayHtml(str: string, options?: DisplayOptions): string {
	const parts = buildLineParts(str);
	const rows: string[] = [];

	for (const [i, part] of parts.entries()) {
		rows.push(
			`<div class="display-line"><span class="line-number">${i + 1}</span><span class="line-content">${renderTextHtml(part.text, options)}${escapeHtml(renderNewlineMarker(part.newline, options))}</span></div>`,
		);
	}

	return rows.join("");
}

export function buildDiffDisplayHtml(fromText: string, toText: string, options?: DisplayOptions): string {
	const ops = buildDiffOps(fromText, toText);
	const rows: string[] = [];
	let lineHtml = "";
	let lineNumber = 1;

	function pushLine(): void {
		rows.push(
			`<div class="display-line"><span class="line-number">${lineNumber}</span><span class="line-content">${lineHtml}</span></div>`,
		);
		lineHtml = "";
		lineNumber += 1;
	}

	for (const op of ops) {
		for (const part of buildLineParts(op.text)) {
			const contentHtml = wrapDiffSpan(op.type, renderTextHtml(part.text, options));
			const newlineHtml = wrapDiffSpan(op.type, escapeHtml(renderNewlineMarker(part.newline, options)));

			lineHtml += contentHtml + newlineHtml;
			if (part.newline) {
				pushLine();
			}
		}
	}

	pushLine();

	return rows.join("");
}

export function cleanString(str: string, options?: CleanOptions): CleanResult {
	let text = String(str);
	const settings = options ?? {};
	let urlDecodeError = false;

	if (settings.urlDecode) {
		try {
			text = decodeURIComponent(text);
		} catch {
			urlDecodeError = true;
		}
	}
	if (settings.stripHtml) {
		text = stripTagBlock(text, "script");
		text = stripTagBlock(text, "style");
		text = stripHtmlTags(text);
	}
	if (settings.nonPrintable) {
		text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\x80-\x9F]/g, "");
	}

	text = applyLineBoxCleanup(text, settings);

	if (settings.tabs) {
		text = text.replace(/\t/g, "");
	}
	if (settings.newlines) {
		text = text.replace(/\r\n|\r|\n/g, "");
	}
	if (settings.removeAllWhitespace) {
		text = text.replace(/\s+/g, "");
	} else if (settings.collapseSpaces) {
		text = text.replace(/ {2,}/g, " ");
	}
	if (settings.trim) {
		text = text.trim();
	}

	return { text, urlDecodeError };
}
