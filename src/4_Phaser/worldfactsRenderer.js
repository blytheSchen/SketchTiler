// Small helper to turn a worldFacts array into readable HTML (English prose)
export default function renderWorldFacts(worldFacts) {
  if (!worldFacts || worldFacts.length === 0) {
    return `<div class="wf-empty">No structures detected in the latest generation.</div>`;
  }

  const escape = (s) => {
    if (s === null || s === undefined) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  const shortCoords = (box) => {
    if (!box) return "";
    if (box.topLeft && typeof box.width === "number" && typeof box.height === "number") {
      const x1 = box.topLeft.x;
      const y1 = box.topLeft.y;
      const x2 = x1 + box.width - 1;
      const y2 = y1 + box.height - 1;
      return `coords: (${x1}, ${y1})–(${x2}, ${y2})`;
    }
    return "";
  };

  const zoneText = (box) => {
    if (!box || !box.topLeft || typeof box.width !== "number" || typeof box.height !== "number") return "";
    // crude zone: use center point
    const cx = box.topLeft.x + Math.floor(box.width / 2);
    const cy = box.topLeft.y + Math.floor(box.height / 2);
    const hZone = cy < 8 ? "top" : (cy < 16 ? "center" : "bottom");
    const vZone = cx < 13 ? "left" : (cx < 26 ? "center" : "right");
    return `${hZone}${vZone === "center" ? "" : " " + vZone}`.trim();
  };

  const listToEnglish = (arr) => {
    if (!arr || arr.length === 0) return "";
    if (arr.length === 1) return escape(arr[0]);
    return escape(arr.slice(0, -1).join(", ")) + " and " + escape(arr[arr.length - 1]);
  };

  let html = `<div class="wf-list">`;
  worldFacts.forEach((s, i) => {
    const idx = i + 1;
    const type = s.type || s.name || "structure";
    const color = s.color || (s.colors && s.colors[0]) || null;
    const box = s.boundingBox || s.box || null;
    const sizeText = box && typeof box.width === "number" && typeof box.height === "number" ? `${box.width}×${box.height}` : null;
    const coords = shortCoords(box);
    const zone = zoneText(box);
    const features = s.features || [];
    const subs = s.substructures || [];
    const rel = s.relativePos || s.relative || [];

    // Title line
    let title = `${idx}) ${escape(type)}`;
    if (color) title += ` — ${escape(color)}`;
    if (sizeText) title += ` — ${sizeText}`;

    html += `<div class="wf-item"><div class="wf-title"><strong>${title}</strong></div>`;

    // Short descriptor
    let descParts = [];
    if (zone) descParts.push(`located in the ${escape(zone)}`);
    if (coords) descParts.push(coords);
    if (features && features.length > 0) {
      // show up to 3 feature phrases
      const f = features.slice(0, 3).map(x => escape(x));
      descParts.push(`features: ${listToEnglish(f)}`);
    }
    if (subs && subs.length > 0) {
      // substructures may have type/colors
      const subPhrases = subs.slice(0, 3).map(sub => {
        if (typeof sub === "string") return escape(sub);
        const t = sub.type || "sub";
        const c = sub.colors && sub.colors.length ? sub.colors.join("/") : null;
        return c ? `${escape(t)} (${escape(c)})` : escape(t);
      });
      descParts.push(`substructures: ${listToEnglish(subPhrases)}`);
    }

    if (descParts.length > 0) {
      html += `<div class="wf-desc">${escape(descParts.join('; '))}</div>`;
    }

    // Relative positions (show up to 2)
    if (rel && rel.length > 0) {
      const relShort = rel.slice(0, 2).map(r => {
        if (typeof r === 'string') return escape(r);
        if (r.relativePos) return escape(r.relativePos) + ` (${escape(r.otherName || '')})`;
        return escape(JSON.stringify(r));
      });
      html += `<div class="wf-rel">Nearby: ${listToEnglish(relShort)}</div>`;
    }

    html += `</div>`; // wf-item
  });
  html += `</div>`;
  return html;
}
