const MERMAID_SELECTOR = '.sl-markdown-content pre[data-language="mermaid"]';
const LOADED_FLAG = '__vrMermaidLoaded';

let mermaidModulePromise;

function getTheme() {
	return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'default';
}

function getMermaidModule() {
	if (!mermaidModulePromise) {
		mermaidModulePromise = import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs')
			.then((mod) => mod.default || mod)
			.catch((error) => {
				console.error('[mermaid] Failed to load module', error);
				return null;
			});
	}
	return mermaidModulePromise;
}

function cleanupExistingDiagrams() {
	document.querySelectorAll('.mermaid-diagram').forEach((node) => node.remove());
	document.querySelectorAll(`${MERMAID_SELECTOR}.mermaid-source-hidden`).forEach((node) => {
		node.classList.remove('mermaid-source-hidden');
	});
}

function sanitizeMermaidCode(block) {
	const codeNode = block.querySelector('code');
	const text = codeNode?.innerText || codeNode?.textContent || block.innerText || '';
	return text.replace(/\u00a0/g, ' ').trim();
}

async function renderMermaidDiagrams() {
	const mermaid = await getMermaidModule();
	if (!mermaid) return;

	cleanupExistingDiagrams();
	const blocks = Array.from(document.querySelectorAll(MERMAID_SELECTOR));
	if (!blocks.length) return;

	mermaid.initialize({
		startOnLoad: false,
		theme: getTheme(),
		securityLevel: 'loose',
		suppressErrorRendering: false,
	});

	let diagramIndex = 0;
	for (const block of blocks) {
		const source = sanitizeMermaidCode(block);
		if (!source) continue;

		const wrapper = document.createElement('div');
		wrapper.className = 'mermaid-diagram';

		const mermaidNode = document.createElement('div');
		mermaidNode.className = 'mermaid';
		mermaidNode.id = `vr-mermaid-${diagramIndex++}`;
		mermaidNode.textContent = source;
		wrapper.appendChild(mermaidNode);

		block.insertAdjacentElement('afterend', wrapper);
		block.classList.add('mermaid-source-hidden');
	}

	try {
		await mermaid.run({ querySelector: '.mermaid-diagram .mermaid' });
	} catch (error) {
		console.error('[mermaid] Rendering error', error);
		cleanupExistingDiagrams();
	}
}

function observeThemeChanges() {
	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
				renderMermaidDiagrams();
				break;
			}
		}
	});
	observer.observe(document.documentElement, { attributes: true });
}

function initialize() {
	if (window[LOADED_FLAG]) return;
	window[LOADED_FLAG] = true;

	renderMermaidDiagrams();
	observeThemeChanges();
	document.addEventListener('astro:after-swap', () => {
		renderMermaidDiagrams();
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
	initialize();
}
