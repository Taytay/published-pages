import {
	buildDiffDisplayHtml,
	buildDisplayHtml,
	type CleanOptions,
	cleanString,
	type DisplayOptions,
} from "./string-cleaner";

function getElement<T extends HTMLElement>(id: string): T {
	const el = document.getElementById(id);
	if (!el) {
		throw new Error(`Element #${id} not found`);
	}
	return el as T;
}

const inputEl = getElement<HTMLTextAreaElement>("inputText");
const outputEl = getElement<HTMLTextAreaElement>("outputText");
const inputDisplayEl = getElement<HTMLDivElement>("inputDisplay");
const diffDisplayEl = getElement<HTMLDivElement>("diffDisplay");
const outputDisplayEl = getElement<HTMLDivElement>("outputDisplay");
const inputCountEl = getElement<HTMLSpanElement>("inputCount");
const outputCountEl = getElement<HTMLSpanElement>("outputCount");
const urlDecodeWarningEl = getElement<HTMLSpanElement>("urlDecodeWarning");
const copyFallbackMsgEl = getElement<HTMLSpanElement>("copyFallbackMsg");
const clearBtn = getElement<HTMLButtonElement>("clearBtn");
const copyBtn = getElement<HTMLButtonElement>("copyBtn");
const resetBtn = getElement<HTMLButtonElement>("resetBtn");

const optNonPrintable = getElement<HTMLInputElement>("optNonPrintable");
const optNewlines = getElement<HTMLInputElement>("optNewlines");
const optTrim = getElement<HTMLInputElement>("optTrim");
const optCollapseSpaces = getElement<HTMLInputElement>("optCollapseSpaces");
const optRemoveAllWhitespace = getElement<HTMLInputElement>("optRemoveAllWhitespace");
const optTabs = getElement<HTMLInputElement>("optTabs");
const optUrlDecode = getElement<HTMLInputElement>("optUrlDecode");
const optStripHtml = getElement<HTMLInputElement>("optStripHtml");
const optShowWhitespace = getElement<HTMLInputElement>("optShowWhitespace");
const optShowInvisible = getElement<HTMLInputElement>("optShowInvisible");
const optRemoveFirstLines = getElement<HTMLInputElement>("optRemoveFirstLines");
const optRemoveLastLines = getElement<HTMLInputElement>("optRemoveLastLines");
const optRemoveFirstChars = getElement<HTMLInputElement>("optRemoveFirstChars");
const optRemoveLastChars = getElement<HTMLInputElement>("optRemoveLastChars");

const allOptions: HTMLInputElement[] = [
	optNonPrintable,
	optNewlines,
	optTrim,
	optCollapseSpaces,
	optRemoveAllWhitespace,
	optTabs,
	optUrlDecode,
	optStripHtml,
	optShowWhitespace,
	optShowInvisible,
	optRemoveFirstLines,
	optRemoveLastLines,
	optRemoveFirstChars,
	optRemoveLastChars,
];

function getCleanOptions(): CleanOptions {
	return {
		nonPrintable: optNonPrintable.checked,
		newlines: optNewlines.checked,
		trim: optTrim.checked,
		collapseSpaces: optCollapseSpaces.checked,
		removeAllWhitespace: optRemoveAllWhitespace.checked,
		tabs: optTabs.checked,
		urlDecode: optUrlDecode.checked,
		stripHtml: optStripHtml.checked,
		removeFirstLines: optRemoveFirstLines.value,
		removeLastLines: optRemoveLastLines.value,
		removeFirstChars: optRemoveFirstChars.value,
		removeLastChars: optRemoveLastChars.value,
	};
}

function update(): void {
	const input = inputEl.value;
	const output = cleanString(input, getCleanOptions());
	const displayOptions: DisplayOptions = {
		showWhitespace: optShowWhitespace.checked,
		showInvisible: optShowInvisible.checked,
	};

	outputEl.value = output.text;
	inputDisplayEl.innerHTML = buildDisplayHtml(input, displayOptions);
	diffDisplayEl.innerHTML = buildDiffDisplayHtml(input, output.text, displayOptions);
	outputDisplayEl.innerHTML = buildDisplayHtml(output.text, displayOptions);
	inputCountEl.textContent = `${input.length} char${input.length === 1 ? "" : "s"}`;
	outputCountEl.textContent = `${output.text.length} char${output.text.length === 1 ? "" : "s"}`;

	if (output.urlDecodeError) {
		urlDecodeWarningEl.classList.remove("d-none");
	} else {
		urlDecodeWarningEl.classList.add("d-none");
	}
}

inputEl.addEventListener("input", update);
for (const opt of allOptions) {
	opt.addEventListener("change", update);
}

clearBtn.addEventListener("click", () => {
	inputEl.value = "";
	copyFallbackMsgEl.classList.add("d-none");
	update();
});

copyBtn.addEventListener("click", () => {
	if (!outputEl.value) return;
	copyFallbackMsgEl.classList.add("d-none");

	if (navigator.clipboard?.writeText) {
		navigator.clipboard.writeText(outputEl.value).then(
			() => {
				copyBtn.textContent = "Copied!";
				copyBtn.classList.add("copied");
				setTimeout(() => {
					copyBtn.textContent = "Copy to Clipboard";
					copyBtn.classList.remove("copied");
				}, 1500);
			},
			() => {
				outputEl.select();
				copyFallbackMsgEl.classList.remove("d-none");
			},
		);
	} else {
		outputEl.select();
		copyFallbackMsgEl.classList.remove("d-none");
	}
});

resetBtn.addEventListener("click", () => {
	optNonPrintable.checked = true;
	optNewlines.checked = true;
	optTrim.checked = false;
	optCollapseSpaces.checked = false;
	optRemoveAllWhitespace.checked = false;
	optTabs.checked = false;
	optUrlDecode.checked = false;
	optStripHtml.checked = false;
	optShowWhitespace.checked = false;
	optShowInvisible.checked = false;
	optRemoveFirstLines.value = "0";
	optRemoveLastLines.value = "0";
	optRemoveFirstChars.value = "0";
	optRemoveLastChars.value = "0";
	update();
});

update();
