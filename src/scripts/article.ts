const diagrams = Array.from(document.querySelectorAll<HTMLElement>("pre[data-language='mermaid']"))
  .map((pre) => {
    const container = document.createElement("div");
    container.className = "mermaid";
    const source = pre.querySelector("code")?.textContent ?? "";
    const fallback = document.createElement("details");
    fallback.className = "mermaid-fallback";
    fallback.open = true;
    const summary = document.createElement("summary");
    summary.textContent = "图表源代码";
    pre.replaceWith(container);
    fallback.append(summary, pre);
    container.append(fallback);
    return { container, source, fallback, summary, seen: false };
  });

// Serialize renders: Mermaid shares global configuration across diagrams.
const pending = new Set<(typeof diagrams)[number]>();
let rendering = false;
let diagramId = 0;
const theme = () => document.documentElement.dataset.theme === "light" ? "default" : "dark";

async function renderPending() {
  if (rendering) return;
  rendering = true;
  try {
    while (pending.size) {
      const diagram = pending.values().next().value!;
      pending.delete(diagram);
      diagram.container.setAttribute("aria-busy", "true");
      let renderId: string | undefined;
      try {
        const { default: mermaid } = await import("mermaid");
        const currentTheme = theme();
        mermaid.initialize({ startOnLoad: false, theme: currentTheme, securityLevel: "strict", suppressErrorRendering: true });
        renderId = `blog-diagram-${++diagramId}`;
        const { svg, bindFunctions } = await mermaid.render(renderId, diagram.source);
        diagram.container.innerHTML = svg;
        bindFunctions?.(diagram.container);
        if (theme() !== currentTheme) pending.add(diagram);
      } catch {
        diagram.summary.textContent = "图表暂时无法显示，查看源代码";
        diagram.container.replaceChildren(diagram.fallback);
      } finally {
        if (renderId) document.getElementById(`d${renderId}`)?.remove();
        diagram.container.removeAttribute("aria-busy");
      }
    }
  } finally {
    rendering = false;
  }
}

function enqueue(diagram: (typeof diagrams)[number]) {
  diagram.seen = true;
  pending.add(diagram);
  void renderPending();
}

if (diagrams.length) {
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const diagram = diagrams.find(({ container }) => container === entry.target);
        if (diagram) enqueue(diagram);
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "200px" });
    diagrams.forEach(({ container }) => observer.observe(container));
  } else {
    diagrams.forEach(enqueue);
  }
  window.addEventListener("themechange", () => diagrams.filter(({ seen }) => seen).forEach(enqueue));
}

const copyStatus = document.createElement("span");
copyStatus.className = "copy-status";
copyStatus.setAttribute("role", "status");
document.body.append(copyStatus);

document.querySelectorAll<HTMLElement>(".prose pre").forEach((block) => {
  if (block.closest(".mermaid")) return;
  const copy = document.createElement("button");
  copy.className = "copy-code";
  copy.type = "button";
  copy.textContent = "复制";
  copy.setAttribute("aria-label", "复制代码");
  let resetTimer: ReturnType<typeof setTimeout>;
  copy.addEventListener("click", async () => {
    clearTimeout(resetTimer);
    copyStatus.textContent = "";
    try {
      await navigator.clipboard.writeText(block.querySelector("code")?.textContent ?? "");
      copy.textContent = "已复制";
      copyStatus.textContent = "代码已复制";
    } catch {
      copy.textContent = "请手动复制";
      copyStatus.textContent = "复制失败，请选中代码后手动复制";
    }
    resetTimer = setTimeout(() => { copy.textContent = "复制"; copyStatus.textContent = ""; }, 2000);
  });
  block.append(copy);
});

export {};
