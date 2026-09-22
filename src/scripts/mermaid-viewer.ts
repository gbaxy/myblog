import type { MermaidConfig } from "mermaid";

const fontFamily = '"Segoe UI", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif';

export function diagramConfig(dark: boolean): MermaidConfig {
  const colors = dark
    ? { canvas: "#191715", node: "#26221e", text: "#eee6dc", line: "#c79561", border: "#a87b4e", group: "#211e1a", note: "#342b20" }
    : { canvas: "#fcfaf7", node: "#f4ece2", text: "#3d3026", line: "#92653c", border: "#ae8055", group: "#f8f3ec", note: "#fff0d9" };
  return {
    startOnLoad: false,
    securityLevel: "strict",
    suppressErrorRendering: true,
    theme: "base",
    fontFamily,
    themeVariables: {
      darkMode: dark, background: colors.canvas, fontFamily, fontSize: "16px",
      primaryColor: colors.node, primaryTextColor: colors.text, primaryBorderColor: colors.border,
      secondaryColor: colors.group, secondaryTextColor: colors.text, secondaryBorderColor: colors.border,
      tertiaryColor: colors.group, tertiaryTextColor: colors.text, tertiaryBorderColor: colors.border,
      lineColor: colors.line, textColor: colors.text, mainBkg: colors.node,
      nodeBorder: colors.border, nodeTextColor: colors.text,
      clusterBkg: colors.group, clusterBorder: colors.border,
      edgeLabelBackground: colors.canvas,
      actorBkg: colors.node, actorBorder: colors.border, actorTextColor: colors.text,
      actorLineColor: colors.border, signalColor: colors.line, signalTextColor: colors.text,
      labelBoxBkgColor: colors.node, labelBoxBorderColor: colors.border, labelTextColor: colors.text,
      loopTextColor: colors.text, noteBkgColor: colors.note, noteBorderColor: colors.border,
      noteTextColor: colors.text, activationBkgColor: colors.group, activationBorderColor: colors.border,
      sequenceNumberColor: colors.canvas,
    },
    flowchart: { htmlLabels: true, curve: "basis", nodeSpacing: 44, rankSpacing: 64, padding: 20, useMaxWidth: false },
    sequence: { useMaxWidth: false, actorMargin: 64, messageMargin: 44, boxMargin: 14, mirrorActors: false },
  };
}

const icons = {
  pan: '<path d="M12 3v18M3 12h18m-12-6 3-3 3 3m-6 12 3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/>',
  minus: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5M7 10h6"/>',
  plus: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5M7 10h6m-3-3v6"/>',
  fit: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><rect x="7" y="7" width="10" height="10" rx="1"/>',
  fullscreen: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
};

/** A dependency-free viewport. Theme redraws replace only the SVG, preserving the view. */
export function createDiagramViewer(container: HTMLElement) {
  const events = new AbortController();
  const toolbar = document.createElement("div");
  toolbar.className = "mermaid-toolbar";
  toolbar.setAttribute("role", "toolbar");
  toolbar.setAttribute("aria-label", "图表工具");

  const viewport = document.createElement("div");
  viewport.className = "mermaid-viewport";
  viewport.tabIndex = 0;
  viewport.setAttribute("role", "region");
  viewport.setAttribute("aria-label", "图表画布；方向键平移，加减键缩放，0 适应画布");
  const scene = document.createElement("div");
  scene.className = "mermaid-scene";
  viewport.append(scene);

  const hint = document.createElement("div");
  hint.className = "mermaid-hint";
  const zoomReadout = document.createElement("button");
  zoomReadout.type = "button";
  zoomReadout.className = "mermaid-scale";
  zoomReadout.title = "恢复原始大小";
  zoomReadout.setAttribute("aria-label", "恢复原始大小");

  let width = 0, height = 0, scale = 1, x = 0, y = 0;
  let fitted = true;
  let panEnabled = true;
  let pointer: { id: number; x: number; y: number } | undefined;
  let lastWidth = 0, lastHeight = 0;

  const paint = () => {
    scene.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    zoomReadout.textContent = `${Math.round(scale * 100)}%`;
  };
  const fitScale = () => Math.min(1, Math.max(1, viewport.clientWidth - 48) / width, Math.max(1, viewport.clientHeight - 76) / height);
  const fit = () => {
    if (!width || !height) return;
    scale = fitScale();
    x = (viewport.clientWidth - width * scale) / 2;
    y = 52 + (viewport.clientHeight - 68 - height * scale) / 2;
    fitted = true;
    paint();
  };
  const zoom = (factor: number, anchorX = viewport.clientWidth / 2, anchorY = viewport.clientHeight / 2) => {
    if (!width) return;
    const next = Math.max(Math.min(0.1, fitScale() / 2), Math.min(4, scale * factor));
    x = anchorX - (anchorX - x) * next / scale;
    y = anchorY - (anchorY - y) * next / scale;
    scale = next;
    fitted = false;
    paint();
  };
  const button = (name: string, icon: keyof typeof icons, action: () => void) => {
    const element = document.createElement("button");
    element.type = "button";
    element.title = name;
    element.setAttribute("aria-label", name);
    element.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[icon]}</svg>`;
    element.addEventListener("click", action);
    toolbar.append(element);
    return element;
  };
  const pan = button("拖拽平移", "pan", () => {
    panEnabled = !panEnabled;
    updatePan();
  });
  const updatePan = () => {
    viewport.classList.toggle("can-pan", panEnabled);
    pan.setAttribute("aria-pressed", String(panEnabled));
    hint.textContent = panEnabled ? "拖动平移 · Ctrl / ⌘ + 滚轮缩放 · 双击适应画布" : "可选择文字 · Ctrl / ⌘ + 滚轮缩放";
  };
  updatePan();
  button("缩小", "minus", () => zoom(1 / 1.25));
  zoomReadout.addEventListener("click", () => zoom(1 / scale));
  toolbar.append(zoomReadout);
  button("放大", "plus", () => zoom(1.25));
  button("适应画布", "fit", fit);
  if (document.fullscreenEnabled) {
    const fullscreen = button("全屏查看", "fullscreen", () => {
      const operation = document.fullscreenElement === container ? document.exitFullscreen() : container.requestFullscreen();
      void operation.catch(() => { hint.textContent = "浏览器暂不支持全屏，可使用缩放按钮查看。"; });
    });
    document.addEventListener("fullscreenchange", () => {
      const active = document.fullscreenElement === container;
      fullscreen.setAttribute("aria-pressed", String(active));
      fullscreen.setAttribute("aria-label", active ? "退出全屏" : "全屏查看");
      fullscreen.title = active ? "退出全屏" : "全屏查看";
    }, { signal: events.signal });
  }

  viewport.addEventListener("pointerdown", (event) => {
    if (!panEnabled || event.button !== 0 || !event.isPrimary || event.pointerType === "touch" || (event.target as Element).closest("a")) return;
    event.preventDefault();
    viewport.focus({ preventScroll: true });
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add("is-panning");
  });
  viewport.addEventListener("pointermove", (event) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    x += event.clientX - pointer.x;
    y += event.clientY - pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    fitted = false;
    paint();
  });
  const endPan = () => { pointer = undefined; viewport.classList.remove("is-panning"); };
  viewport.addEventListener("lostpointercapture", endPan);
  viewport.addEventListener("pointerup", endPan);
  viewport.addEventListener("pointercancel", endPan);
  viewport.addEventListener("dblclick", (event) => {
    if (!(event.target as Element).closest("a") && panEnabled) fit();
  });
  viewport.addEventListener("wheel", (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const bounds = viewport.getBoundingClientRect();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1);
    zoom(Math.exp(-Math.max(-250, Math.min(250, delta)) * 0.004), event.clientX - bounds.left, event.clientY - bounds.top);
  }, { passive: false });
  viewport.addEventListener("keydown", (event) => {
    if (event.target !== viewport || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "+" || event.key === "=") zoom(1.25);
    else if (event.key === "-") zoom(1 / 1.25);
    else if (event.key === "0") fit();
    else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      x += event.key === "ArrowLeft" ? 40 : event.key === "ArrowRight" ? -40 : 0;
      y += event.key === "ArrowUp" ? 40 : event.key === "ArrowDown" ? -40 : 0;
      fitted = false;
      paint();
    } else return;
    event.preventDefault();
  });
  const resize = () => {
    if (!width) return;
    const naturalScale = Math.min(1, Math.max(1, container.clientWidth - 48) / width);
    container.style.setProperty("--diagram-height", `${Math.min(580, Math.max(280, height * naturalScale + 76))}px`);
    const nextWidth = viewport.clientWidth, nextHeight = viewport.clientHeight;
    if (nextWidth === lastWidth && nextHeight === lastHeight) return;
    if (fitted) fit();
    else {
      x += (nextWidth - lastWidth) / 2;
      y += (nextHeight - lastHeight) / 2;
      paint();
    }
    lastWidth = nextWidth;
    lastHeight = nextHeight;
  };
  container.replaceChildren(toolbar, viewport, hint);
  const observer = new ResizeObserver(resize);
  observer.observe(viewport);

  return {
    update(svg: string) {
      scene.innerHTML = svg;
      const image = scene.querySelector("svg");
      if (!image) throw new Error("Mermaid did not return an SVG");
      const viewBox = image.viewBox.baseVal;
      width = viewBox.width;
      height = viewBox.height;
      if (!width || !height) throw new Error("Invalid Mermaid SVG dimensions");
      image.style.width = `${width}px`;
      image.style.height = `${height}px`;
      image.style.maxWidth = "none";
      scene.style.width = `${width}px`;
      scene.style.height = `${height}px`;
      resize();
      if (fitted) fit(); else paint();
    },
    destroy() { observer.disconnect(); events.abort(); },
  };
}

