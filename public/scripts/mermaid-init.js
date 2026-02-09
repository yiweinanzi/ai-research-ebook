// Mermaid initialization - fixed for Expressive Code
(function() {
    'use strict';

    const SELECTOR = '.sl-markdown-content pre[data-language="mermaid"]';
    const LOADED = '__vrMermaidInited';
    let mermaid = null;

    function isDark() {
        return document.documentElement.dataset.theme === 'dark';
    }

    function getCode(block) {
        // 方法1：优先从 Expressive Code 的 data-code 属性获取（包含换行）
        const copyButton = block.closest('.expressive-code')?.querySelector('.copy button');
        if (copyButton) {
            const dataCode = copyButton.dataset.code;
            if (dataCode) {
                // Expressive Code 用特殊字符标记换行 (0x00)
                return dataCode.replace(/\0/g, '\n');
            }
        }

        // 方法2：从 div.ec-line 提取
        const lines = block.querySelectorAll('.ec-line');
        if (lines.length > 0) {
            return Array.from(lines).map(line => {
                const codeSpan = line.querySelector('.code');
                if (!codeSpan) return '';
                // 获取原始文本内容
                return codeSpan.textContent || '';
            }).join('\n');
        }

        // 方法3：回退到 code 标签
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

            // 调试：打印获取到的代码
            if (text) {
                console.log('[mermaid] Diagram', i + 1, 'code:\n' + text.substring(0, 300));
            }

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
            setTimeout(renderAll, 800);
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
