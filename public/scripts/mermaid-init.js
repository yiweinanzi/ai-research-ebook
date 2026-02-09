// Mermaid 初始化脚本 - 使用 mermaid.run() API
(function() {
	'use strict';

	const MERMAID_SELECTOR = '.sl-markdown-content pre[data-language="mermaid"]';
	const LOADED_FLAG = '__vrMermaidLoaded';

	let mermaidPromise;

	function isDarkTheme() {
		return document.documentElement.dataset.theme === 'dark';
	}

	async function getMermaid() {
		if (!mermaidPromise) {
			mermaidPromise = import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs')
				.then(mod => {
					const m = mod.default || mod;
					m.initialize({
						startOnLoad: false,
						securityLevel: 'loose',
						theme: isDarkTheme() ? 'dark' : 'base'
					});
					return m;
				})
				.catch(err => {
					console.error('[mermaid] Load failed:', err);
					return null;
				});
		}
		return mermaidPromise;
	}

	function cleanup() {
		document.querySelectorAll('.mermaid-diagram').forEach(el => el.remove());
		document.querySelectorAll(`${MERMAID_SELECTOR}.mermaid-rendered`).forEach(el => {
			el.classList.remove('mermaid-rendered');
			el.style.display = '';
		});
	}

	function getCode(block) {
		const code = block.querySelector('code');
		return code?.textContent || '';
	}

	async function renderOne(mermaid, block, index) {
		const code = getCode(block);
		if (!code.trim()) return false;

		const wrapper = document.createElement('div');
		wrapper.className = 'mermaid-diagram';
		wrapper.style.cssText = 'padding: 16px; background: var(--sl-color-bg-nav, #212121); border-radius: 8px; margin: 1.5rem 0;';

		const container = document.createElement('div');
		container.className = 'mermaid-render-target';
		wrapper.appendChild(container);

		block.insertAdjacentElement('afterend', wrapper);

		try {
			// 使用 mermaid.run() - 更稳定
			const id = `mermaid-${index}-${Date.now()}`;
			container.id = id;

			// 直接运行，不依赖 render 返回值
			await mermaid.run({
				querySelector: `#${id}`,
				text: code
			});

			// 成功：隐藏原始代码块
			block.classList.add('mermaid-rendered');
			block.style.display = 'none';
			console.log(`[mermaid] Diagram ${index + 1} OK`);
			return true;
		} catch (err) {
			console.warn(`[mermaid] Diagram ${index + 1} failed:`, err.message);
			wrapper.remove();
			block.classList.remove('mermaid-rendered');
			block.style.display = '';
			return false;
		}
	}

	async function renderAll() {
		const mermaid = await getMermaid();
		if (!mermaid) return;

		cleanup();

		const blocks = Array.from(document.querySelectorAll(MERMAID_SELECTOR);
		if (!blocks.length) return;

		console.log(`[mermaid] Found ${blocks.length} diagrams`);

		let ok = 0;
		for (let i = 0; i < blocks.length; i++) {
			if (await renderOne(mermaid, blocks[i], i)) ok++;
		}

		console.log(`[mermaid] Done: ${ok}/${blocks.length}`);
	}

	function observeTheme() {
		const obs = new MutationObserver(() => {
			renderAll();
		});
		obs.observe(document.documentElement, { attributes: true, subtree: false });
	}

	function init() {
		if (window[LOADED_FLAG]) return;
		window[LOADED_FLAG] = true;

		setTimeout(() => renderAll(), 200);
		observeTheme();
	}

	// Astro 支持
	document.addEventListener('astro:after-swap', () => {
		window[LOADED_FLAG] = false;
		init();
	});

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

	window.renderMermaidDiagrams = renderAll;
})();
