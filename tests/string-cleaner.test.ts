import { expect, test } from "vitest";
import { buildDiffHtml, buildDisplayHtml, cleanString, visualizeText } from "../src/string-cleaner";

test("preserves existing newline removal behavior", () => {
	const result = cleanString("hello\r\nworld", { newlines: true });
	expect(result.text).toBe("helloworld");
	expect(result.urlDecodeError).toBe(false);
});

test("removes all whitespace when requested", () => {
	const result = cleanString(" a\tb \n c\r\n", {
		removeAllWhitespace: true,
	});
	expect(result.text).toBe("abc");
});

test("collapsing spaces still works when removing all whitespace is disabled", () => {
	const result = cleanString("a   b    c", {
		collapseSpaces: true,
	});
	expect(result.text).toBe("a b c");
});

test("removes boxed terminal borders with line and character trimming options", () => {
	const input = [
		"=======================",
		"| real content is inside of here |",
		"| and there is more here.          |",
		"=======================",
	].join("\n");

	const result = cleanString(input, {
		removeFirstLines: 1,
		removeLastLines: 1,
		removeFirstChars: 2,
		removeLastChars: 2,
	});

	expect(result.text).toBe(["real content is inside of here", "and there is more here.         "].join("\n"));
});

test("over-large line and character trimming safely produces empty content", () => {
	const result = cleanString("abc\ndef", {
		removeFirstLines: 3,
		removeFirstChars: 10,
		removeLastChars: 10,
	});
	expect(result.text).toBe("");
});

test("reports URL decode errors without changing the text", () => {
	const result = cleanString("%E0%A4%A", {
		urlDecode: true,
	});
	expect(result.text).toBe("%E0%A4%A");
	expect(result.urlDecodeError).toBe(true);
});

test("removes html tags and script block contents", () => {
	const result = cleanString("<p>Hello</p><script>alert(1)</script><style>body{}</style>World", {
		stripHtml: true,
	});
	expect(result.text).toBe("HelloWorld");
});

test("visualizes whitespace characters when requested", () => {
	const result = visualizeText("a b\tc\nd", {
		showWhitespace: true,
	});
	expect(result).toBe("a·b⇥\tc↵\nd");
});

test("visualizes non-whitespace control characters when requested", () => {
	const result = visualizeText(`A${String.fromCharCode(27)}B`, {
		showInvisible: true,
	});
	expect(result).toBe("A\\x1BB");
});

test("builds diff html with escaped content and added/removed spans", () => {
	const result = buildDiffHtml("a<bc", "a<xc");
	expect(result).toBe('a&lt;<span class="diff-removed">b</span><span class="diff-added">x</span>c');
});

test("builds line-numbered display html for multiline text", () => {
	const result = buildDisplayHtml("alpha\nbeta", {});
	expect(result).toBe(
		'<div class="display-line"><span class="line-number">1</span><span class="line-content">alpha</span></div><div class="display-line"><span class="line-number">2</span><span class="line-content">beta</span></div>',
	);
});
