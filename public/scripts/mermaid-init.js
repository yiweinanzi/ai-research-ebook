// Mermaid initialization - stable version
(function() {
    'use strict';

    const SELECTOR = '.sl-markdown-content pre[data-language="mermaid"]';
    const LOADED = '__vrMermaidInited';
    let mermaid = null;

    function isDark() {
        return document.documentElement.dataset.theme === 'dark';
    }

    function getCode(block) {
        const code = block.querySelector('code');
        return code ? (code.textContent || code.innerText || '') : '';
    }

    function renderAll() {
        if (!mermaid) return;

        const blocks = document.querySelectorAll(SELECTOR);
        if (!blocks.length) return;

        console.log('[mermaid] Found', blocks.length, 'diagrams');

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const text = getCode(block);
            if (!text.trim()) continue;

            const div = document.createElement('div');
            div.className = 'mermaid-diagram';
            div.style.cssText = 'padding:16px;background:var(--sl-color-bg-nav,#212121);border-radius:8px;margin:1.5rem 0;overflow-x:auto';

            const pre = document.createElement('pre');
            pre.className = 'mermaid';
            pre.id = 'mermaid-' + i + '-' + Date.now();
            pre.textContent = text;

            div.appendChild(pre);
            block.parentNode.insertBefore(div, block.nextSibling);
        }

        mermaid.init(undefined, '.mermaid').then(function() {
            console.log('[mermaid] Init done');
            for (let i = 0; i < blocks.length; i++) {
                blocks[i].style.display = 'none';
            }
        }).catch(function(e) {
            console.warn('[mermaid] Init failed:', e.message);
        });
    }

    async function load() {
        if (window[LOADED]) return;
        window[LOADED] = true;

        try {
            const mod = await import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs');
            mermaid = mod.default || mod;

            mermaid.initialize({
                startOnLoad: false,
                securityLevel: 'loose',
                theme: isDark() ? 'dark' : 'base'
            });

            console.log('[mermaid] Loaded');
            setTimeout(renderAll, 500);
        } catch (e) {
            console.error('[mermaid] Load failed:', e);
        }
    }

    document.addEventListener('astro:after-swap', function() {
        window[LOADED] = false;
        load();
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', load);
    } else {
        load();
    }

    window.renderMermaidDiagrams = renderAll;
})();
