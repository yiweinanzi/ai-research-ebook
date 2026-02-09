// Mermaid 初始化 - 使用 init() 方法
(function() {
	'use strict';

	const MERMAID_SELECTOR = '.sl-markdown-content pre[data-language="mermaid"]';
	const LOADED_FLAG = '__vrMermaidInit';

	function isDarkTheme() {
		return document.documentElement.dataset.theme === 'dark';
	}

	async function initMermaid() {
		try {
			const mermaid = await import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs');
			const m = mermaid.default || mermaid;

			m.initialize({
				startOnLoad: false,
				securityLevel: 'loose',
				theme: isDarkTheme() ? 'dark' : 'base'
			});

			return m;
		} catch (e) {
			console.error('[mermaid] Load failed:', e);
			return null;
		}
	}

	async function render() {
		const mermaid = await initMermaid();
		if (!mermaid) return;

		// 查找所有 mermaid 代码块
		const blocks = document.querySelectorAll(MERMAID_SELECTOR);
		if (!blocks.length) return;

		console.log('[mermaid] Found', blocks.length, 'diagrams');

		// 为每个代码块创建容器并渲染
		for (let i = 0; i < blocks.length; i++) {
			const block = blocks[i];
			const code = block.querySelector('code');
			if (!code) continue;

			const text = code.textContent || code.innerText || '';
			if (!text.trim()) continue;

			// 创建 SVG 容器
			const div = document.createElement('div');
			div.className = 'mermaid-diagram';
			div.style.cssText = 'padding: 16px; background: var(--sl-color-bg-nav, #212121); border-radius: 8px; margin: 1.5rem 0; overflow-x: auto;';

			const pre = document.createElement('pre');
			pre.className = 'mermaid';
			pre.id = 'mermaid-' + i + '-' + Date.now();
			pre.textContent = text;

			div.appendChild(pre);
			block.insertAdjacentElement('afterend', div);
		}

		// 使用 init 初始化所有 mermaid 元素
		try {
			await mermaid.init(undefined, '.mermaid');
			console.log('[mermaid] Init OK');

			// 隐藏原始代码块
			blocks.forEach(b => {
				b.style.display = 'none';
				b.classList.add('mermaid-hidden');
			});
		} catch (e) {
			console.warn('[mermaid] Init failed:', e.message);
		}
	}

	function init() {
		if (window[LOADED_FLAG]) return;
		window[LOADED_FLAG] = true;

		// 延迟执行
		setTimeout(() => render(), 300);
	}

	// Astro 页面切换
	document.addEventListener('astro:after-swap', () => {
		window[LOADED_FLAG] = false;
		init();
	});

	// 启动
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
