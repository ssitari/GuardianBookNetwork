// Guardian Books Network — script.js

const svg = d3.select("svg");
const container = svg.append("g").attr("class", "container");

const width = window.innerWidth;
const height = window.innerHeight;
svg.attr("width", width).attr("height", height);

// ── Tooltip ───────────────────────────────────────────────────────────────────
const tooltip = d3.select("body").append("div").attr("class", "tt").style("opacity", 0);

// ── Zoom ──────────────────────────────────────────────────────────────────────
let currentZoom = 1;
const zoom = d3.zoom()
  .scaleExtent([0.08, 10])
  .on("zoom", (event) => {
    container.attr("transform", event.transform);
    currentZoom = event.transform.k;
    updateLabelVisibility();
  });
svg.call(zoom);

// ── State ─────────────────────────────────────────────────────────────────────
let activeNode = null;
let filterMode = null; // null | { type: "author"|"book"|"voter", id: string }

// ── Load data ─────────────────────────────────────────────────────────────────
d3.csv("guardian_votes.csv").then((rows) => {

  const nodesMap = new Map();
  const links    = [];
  const ballots  = {};

  rows.forEach((row) => {
    const voter  = row.voter.trim();
    const book   = row.book.trim();
    const author = (row.author || "").trim();
    const pos    = +row.position;
    const top100 = row.top100 === "TRUE";

    if (!ballots[voter]) ballots[voter] = [];
    ballots[voter].push(book);

    if (!nodesMap.has(voter)) nodesMap.set(voter, { id: voter, type: "voter" });
    if (!nodesMap.has(book))  nodesMap.set(book, { id: book, type: "book", top100, author });

    links.push({ source: voter, target: book, position: pos });
  });

  // Co-occurrence links
  const pairCounts = {};
  Object.values(ballots).forEach((bl) => {
    for (let i = 0; i < bl.length; i++) {
      for (let j = i + 1; j < bl.length; j++) {
        const key = bl[i] < bl[j] ? `${bl[i]}|${bl[j]}` : `${bl[j]}|${bl[i]}`;
        pairCounts[key] = (pairCounts[key] || 0) + 1;
      }
    }
  });
  const coLinks = [];
  Object.entries(pairCounts).forEach(([key, count]) => {
    if (count < 8) return;
    const [source, target] = key.split("|");
    coLinks.push({ source, target, strength: count });
  });

  // Vote counts → radius
  const voteCounts = {};
  links.forEach((l) => { voteCounts[l.target] = (voteCounts[l.target] || 0) + 1; });

  const nodes = Array.from(nodesMap.values()).map((n) => {
    n.votes = n.type === "book" ? voteCounts[n.id] || 1 : 1;
    return n;
  });

  const maxVotes    = d3.max(nodes, (d) => d.votes);
  const radiusScale = d3.scaleSqrt().domain([1, maxVotes]).range([4, 24]);
  const edgeWidthScale = d3.scaleLinear().domain([10, 1]).range([0.3, 3.5]);

  // Adjacency
  const linkedByIndex = {};
  links.forEach((d) => {
    const s = typeof d.source === "object" ? d.source.id : d.source;
    const t = typeof d.target === "object" ? d.target.id : d.target;
    linkedByIndex[`${s},${t}`] = true;
    linkedByIndex[`${t},${s}`] = true;
  });
  function isConnected(a, b) {
    return linkedByIndex[`${a.id},${b.id}`] || a.id === b.id;
  }

  // Populate dropdowns
  const allAuthors = [...new Set(nodes.filter(n => n.type === "book").map(n => n.author).filter(Boolean))].sort();
  const allBooks   = nodes.filter(n => n.type === "book").map(n => n.id).sort();
  const allVoters  = nodes.filter(n => n.type === "voter").map(n => n.id).sort();

  function populateSelect(id, items) {
    const sel = document.getElementById(id);
    items.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item;
      opt.textContent = item;
      sel.appendChild(opt);
    });
  }
  populateSelect("authorSelect", allAuthors);
  populateSelect("bookSelect",   allBooks);
  populateSelect("voterSelect",  allVoters);

  // ── Simulation ────────────────────────────────────────────────────────────
  const simulation = d3.forceSimulation(nodes)
    .force("link",      d3.forceLink(links).id(d => d.id).distance(d => 30 + d.position * 5).strength(0.4))
    .force("coLinks",   d3.forceLink(coLinks).id(d => d.id).distance(60).strength(d => Math.min(d.strength * 0.18, 0.45)))
    .force("charge",    d3.forceManyBody().strength(-55).distanceMax(300))
    .force("center",    d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide(d => d.type === "book" ? radiusScale(d.votes) + 3 : 6));

  // ── Draw layers ───────────────────────────────────────────────────────────
  const coLink = container.append("g").attr("class", "co-links")
    .selectAll("line").data(coLinks).join("line")
    .attr("stroke", "#7b5ea7")
    .attr("stroke-opacity", 0.18)
    .attr("stroke-width", d => Math.min(d.strength * 0.15, 1.8))
    .attr("stroke-dasharray", "3,4");

  const link = container.append("g").attr("class", "vote-links")
    .selectAll("line").data(links).join("line")
    .attr("stroke",         d => d.position <= 3 ? "#e8c97a" : "#555")
    .attr("stroke-opacity", d => d.position <= 3 ? 0.35 : 0.15)
    .attr("stroke-width", 0.7);

  const node = container.append("g").attr("class", "nodes")
    .selectAll("circle").data(nodes).join("circle")
    .attr("r",            d => d.type === "book" ? radiusScale(d.votes) : 3.5)
    .attr("fill",         d => d.type === "voter" ? "#4dabf7" : d.top100 ? "#fe9929" : "#ffffd4")
    .attr("fill-opacity", d => d.type === "voter" ? 0.7 : d.top100 ? 1 : 0.65)
    .attr("stroke",       d => d.type === "voter" ? "none" : d.top100 ? "#cc6600" : "#cccc88")
    .attr("stroke-width", d => d.type === "book" && d.top100 ? 1.5 : 0.5)
    .call(drag(simulation))
    .on("mouseover", handleMouseover)
    .on("mouseout",  handleMouseout)
    .on("click",     handleClick);

  const label = container.append("g").attr("class", "labels")
    .selectAll("text").data(nodes).join("text")
    .text(d => d.id)
    .attr("paint-order", "stroke")
    .attr("stroke", "#0d0d12")
    .attr("stroke-width", 2.5)
    .attr("stroke-linejoin", "round")
    .style("font-size", "10px")
    .style("opacity", 0)
    .style("pointer-events", "none");

  function updateLabelVisibility() {
    const threshold = Math.max(1, Math.round(12 / currentZoom));
    label.style("opacity", d => {
      if (d.type !== "book") return 0;
      if (filterMode) return 0; // handled by applyFilter
      return d.votes >= threshold ? 0.92 : 0;
    });
  }
  updateLabelVisibility();

  // ── Tick ──────────────────────────────────────────────────────────────────
  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
    coLink
      .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
    node.attr("cx", d => d.x).attr("cy", d => d.y);
    label
      .attr("x", d => {
        const angle  = Math.atan2(d.y - height / 2, d.x - width / 2);
        const base   = d.type === "voter" ? 10 : radiusScale(d.votes) + 6;
        const jitter = d.type === "voter" ? (d.index % 5) * 2 - 4 : 0;
        return d.x + Math.cos(angle) * (base + jitter);
      })
      .attr("y", d => {
        const angle  = Math.atan2(d.y - height / 2, d.x - width / 2);
        const base   = d.type === "voter" ? 10 : radiusScale(d.votes) + 6;
        const jitter = d.type === "voter" ? (d.index % 5) * 2 - 4 : 0;
        return d.y + Math.sin(angle) * (base + jitter);
      })
      .attr("text-anchor",      d => d.x < width / 2 ? "end" : "start")
      .attr("dominant-baseline", "middle");
  });

  // ── Filter logic ──────────────────────────────────────────────────────────
  function applyFilter(mode, id) {
    filterMode = { mode, id };
    activeNode = null;

    let highlightNodeIds = new Set();

    if (mode === "book") {
      highlightNodeIds.add(id);
      // all voters who voted for this book
      links.forEach(l => {
        const t = typeof l.target === "object" ? l.target.id : l.target;
        const s = typeof l.source === "object" ? l.source.id : l.source;
        if (t === id) highlightNodeIds.add(s);
      });
    } else if (mode === "author") {
      // all books by this author + their voters
      const authorBooks = new Set(nodes.filter(n => n.type === "book" && n.author === id).map(n => n.id));
      authorBooks.forEach(b => highlightNodeIds.add(b));
      links.forEach(l => {
        const t = typeof l.target === "object" ? l.target.id : l.target;
        const s = typeof l.source === "object" ? l.source.id : l.source;
        if (authorBooks.has(t)) highlightNodeIds.add(s);
      });
    } else if (mode === "voter") {
      highlightNodeIds.add(id);
      // all books this voter voted for
      links.forEach(l => {
        const s = typeof l.source === "object" ? l.source.id : l.source;
        const t = typeof l.target === "object" ? l.target.id : l.target;
        if (s === id) highlightNodeIds.add(t);
      });
    }

    node.transition().duration(200)
      .style("opacity", d => highlightNodeIds.has(d.id) ? 1 : 0.05);

    label.transition().duration(200)
      .style("opacity", d => d.type === "book" && highlightNodeIds.has(d.id) ? 1 : 0);

    link.transition().duration(200)
      .style("stroke-opacity", l => {
        const s = typeof l.source === "object" ? l.source.id : l.source;
        const t = typeof l.target === "object" ? l.target.id : l.target;
        return highlightNodeIds.has(s) && highlightNodeIds.has(t) ? 0.7 : 0.03;
      })
      .style("stroke-width", l => {
        const s = typeof l.source === "object" ? l.source.id : l.source;
        const t = typeof l.target === "object" ? l.target.id : l.target;
        return highlightNodeIds.has(s) && highlightNodeIds.has(t) ? edgeWidthScale(l.position) : 0.4;
      });

    coLink.transition().duration(200).style("stroke-opacity", 0.04);
  }

  function clearFilter() {
    filterMode = null;
    activeNode = null;
    tooltip.transition().duration(200).style("opacity", 0);
    resetHighlight();
    // reset all selects
    ["authorSelect","bookSelect","voterSelect"].forEach(id => {
      document.getElementById(id).value = "";
    });
  }

  function resetHighlight() {
    node.transition().duration(200).style("opacity", 1);
    updateLabelVisibility();
    label.transition().duration(200).style("fill", "#e0e0e0");
    link.transition().duration(200)
      .style("stroke-width",   0.7)
      .style("stroke-opacity", d => d.position <= 3 ? 0.35 : 0.15)
      .style("stroke",         d => d.position <= 3 ? "#e8c97a" : "#555");
    coLink.transition().duration(200).style("stroke-opacity", 0.18);
  }

  // ── Hover / click ─────────────────────────────────────────────────────────
  function handleMouseover(event, d) {
    if (activeNode || filterMode) return;
    showTooltip(event, d);
    applyHighlight(d);
  }

  function handleMouseout() {
    if (activeNode || filterMode) return;
    tooltip.transition().duration(200).style("opacity", 0);
    resetHighlight();
  }

  function handleClick(event, d) {
    event.stopPropagation();
    if (filterMode) { clearFilter(); return; }
    if (activeNode && activeNode.id === d.id) {
      activeNode = null;
      tooltip.transition().duration(200).style("opacity", 0);
      resetHighlight();
    } else {
      activeNode = d;
      showTooltip(event, d);
      applyHighlight(d);
      const scale = Math.min(currentZoom * 1.4, 4);
      svg.transition().duration(600).call(
        zoom.transform,
        d3.zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-d.x, -d.y)
      );
    }
  }

  svg.on("click", () => {
    if (activeNode) {
      activeNode = null;
      tooltip.transition().duration(200).style("opacity", 0);
      resetHighlight();
    }
  });

  function showTooltip(event, d) {
    if (d.type === "book") {
      const voterList = links
        .filter(l => (typeof l.target === "object" ? l.target.id : l.target) === d.id)
        .sort((a,b) => a.position - b.position)
        .slice(0, 5)
        .map(l => `<span class="tt-voter">${typeof l.source === "object" ? l.source.id : l.source} <em>#${l.position}</em></span>`)
        .join("");
      tooltip.html(
        `<div class="tt-title">${d.id}</div>` +
        (d.author ? `<div class="tt-author">by ${d.author}</div>` : "") +
        `<div class="tt-votes">${d.votes} vote${d.votes !== 1 ? "s" : ""}` +
        (d.top100 ? ' <span class="tt-badge">Top 100</span>' : "") +
        `</div>` +
        (voterList ? `<div class="tt-voters">${voterList}</div>` : "")
      );
    } else {
      const voterLinks = links.filter(l => (typeof l.source === "object" ? l.source.id : l.source) === d.id)
        .sort((a, b) => a.position - b.position);
      const bookList = voterLinks.slice(0, 5)
        .map(l => `<span class="tt-voter">#${l.position} ${typeof l.target === "object" ? l.target.id : l.target}</span>`)
        .join("");
      tooltip.html(
        `<div class="tt-title">${d.id}</div>` +
        `<div class="tt-votes">Voted for ${voterLinks.length} book${voterLinks.length !== 1 ? "s" : ""}</div>` +
        (bookList ? `<div class="tt-voters">${bookList}</div>` : "")
      );
    }
    tooltip
      .style("left", event.pageX + 14 + "px")
      .style("top",  event.pageY - 10 + "px")
      .transition().duration(120).style("opacity", 1);
  }

  function applyHighlight(d) {
    node.transition().duration(150)
      .style("opacity", o => isConnected(d, o) ? 1 : 0.06);
    label.transition().duration(150)
      .style("opacity", o => isConnected(d, o) ? 1 : 0)
      .style("fill",    o => o.id === d.id ? "#fff" : o.type === "voter" ? "#4dabf7" : "#ccc")
      .style("font-size",    o => o.type === "voter" ? "9px" : "10px")
      .style("font-style",   o => o.type === "voter" ? "italic" : "normal");
    link.transition().duration(150)
      .style("stroke-width", o => {
        const s = typeof o.source === "object" ? o.source.id : o.source;
        const t = typeof o.target === "object" ? o.target.id : o.target;
        return s === d.id || t === d.id ? edgeWidthScale(o.position) : 0.4;
      })
      .style("stroke-opacity", o => {
        const s = typeof o.source === "object" ? o.source.id : o.source;
        const t = typeof o.target === "object" ? o.target.id : o.target;
        return s === d.id || t === d.id ? 0.85 : 0.03;
      })
      .style("stroke", o => {
        const s = typeof o.source === "object" ? o.source.id : o.source;
        const t = typeof o.target === "object" ? o.target.id : o.target;
        return s === d.id || t === d.id ? (o.position <= 3 ? "#e8c97a" : "#aaa") : "#333";
      });
    coLink.transition().duration(150)
      .style("stroke-opacity", o => {
        const s = typeof o.source === "object" ? o.source.id : o.source;
        const t = typeof o.target === "object" ? o.target.id : o.target;
        return s === d.id || t === d.id ? 0.6 : 0.04;
      });
  }

  // ── Drag ──────────────────────────────────────────────────────────────────
  function drag(simulation) {
    return d3.drag()
      .on("start", (event, d) => {
        event.sourceEvent.stopPropagation();
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on("drag",  (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on("end",   (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null; d.fy = null;
      });
  }

  // ── Wire up controls ──────────────────────────────────────────────────────
  ["authorSelect","bookSelect","voterSelect"].forEach(selId => {
    document.getElementById(selId).addEventListener("change", (e) => {
      const val = e.target.value;
      if (!val) { clearFilter(); return; }
      // clear the other two
      ["authorSelect","bookSelect","voterSelect"].filter(id => id !== selId)
        .forEach(id => { document.getElementById(id).value = ""; });
      const modeMap = { authorSelect: "author", bookSelect: "book", voterSelect: "voter" };
      applyFilter(modeMap[selId], val);
    });
  });

  document.getElementById("clearFilter").addEventListener("click", clearFilter);

  document.getElementById("resetZoom").addEventListener("click", () => {
    svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
  });

  document.getElementById("panelToggle").addEventListener("click", () => {
    const panel = document.getElementById("panel");
    panel.classList.toggle("collapsed");
    document.getElementById("panelToggle").textContent =
      panel.classList.contains("collapsed") ? "▸" : "▾";
  });

});
