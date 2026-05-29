// Guardian Books Network (D3 v7)
// - Nodes: voters + books
// - Links:
//   1) voter -> book (one per ballot entry), weighted by rank/position
//   2) book <-> book (if two books co-occur on many ballots)

const svg = d3.select("svg");
const container = svg.append("g");

// Canvas size (fixed at load time)
const width = window.innerWidth;
const height = window.innerHeight;

svg.attr("width", width).attr("height", height);

// Zoom/pan: apply transforms to the container <g>, not the <svg> itself
const zoom = d3
  .zoom()
  .scaleExtent([0.1, 8])
  .on("zoom", (event) => {
    container.attr("transform", event.transform);
  });

svg.call(zoom);

// Load vote data
d3.csv("guardian_votes.csv").then((rows) => {
  // Deduplicate nodes by id
  const nodesMap = new Map();

  // voter -> book links (one per row)
  const links = [];

  // Collect each voter's full ballot list: { [voterName]: [book1, book2, ...] }
  const ballots = {};

  // ---- Parse rows into nodes + links ----
  rows.forEach((row) => {
    // These fields must exist in the CSV
    const voter = row.voter.trim();
    const book = row.book.trim();

    // Store ballot list for co-occurrence counting
    if (!ballots[voter]) ballots[voter] = [];
    ballots[voter].push(book);

    // Voter node
    if (!nodesMap.has(voter)) {
      nodesMap.set(voter, { id: voter, type: "voter" });
    }

    // Book node
    if (!nodesMap.has(book)) {
      nodesMap.set(book, {
        id: book,
        type: "book",
        top100: row.top100 === "TRUE",
        author: row.author,
      });
    }

    // Edge from voter -> book, with numeric ranking position (1..10)
    links.push({
      source: voter,
      target: book,
      position: +row.position,
    });
  });

  // ---- Build "shared book" links based on co-occurrence on ballots ----
  const sharedBookLinks = [];
  const pairCounts = {};
  const voteCounts = {};

  // Count how many times each pair of books appears together on a ballot
  Object.values(ballots).forEach((bookList) => {
    for (let i = 0; i < bookList.length; i++) {
      for (let j = i + 1; j < bookList.length; j++) {
        const a = bookList[i];
        const b = bookList[j];

        // Normalise ordering so A|B equals B|A
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        pairCounts[key] = (pairCounts[key] || 0) + 1;
      }
    }
  });

  // Convert co-occurrence counts to links; ignore weak relationships
  Object.entries(pairCounts).forEach(([key, count]) => {
    if (count < 8) return;

    const [source, target] = key.split("|");
    sharedBookLinks.push({ source, target, strength: count });
  });

  // Count total votes per book (used for radius)
  links.forEach((link) => {
    voteCounts[link.target] = (voteCounts[link.target] || 0) + 1;
  });

  // Final nodes array + derived properties
  const nodes = Array.from(nodesMap.values()).map((node) => {
    node.votes = node.type === "book" ? voteCounts[node.id] || 1 : 1;

    // (Currently unused; left as-is)
    node.labelOffsetX = (Math.random() - 0.5) * 10;
    node.labelOffsetY = (Math.random() - 0.5) * 10;

    return node;
  });

  // Styling scales
  const edgeWidthScale = d3.scaleLinear().domain([10, 1]).range([0.4, 4]);

  const maxVotes = d3.max(nodes, (d) => d.votes);

  const radiusScale = d3.scaleSqrt().domain([1, maxVotes]).range([3, 22]);

  // Build adjacency lookup for hover highlighting
  const linkedByIndex = {};
  links.forEach((d) => {
    const source = typeof d.source === "object" ? d.source.id : d.source;
    const target = typeof d.target === "object" ? d.target.id : d.target;

    linkedByIndex[`${source},${target}`] = true;
    linkedByIndex[`${target},${source}`] = true;
  });

  function isConnected(a, b) {
    return (
      linkedByIndex[`${a.id},${b.id}`] ||
      linkedByIndex[`${b.id},${a.id}`] ||
      a.id === b.id
    );
  }

  // ---- Force simulation ----
  const simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink(links)
        .id((d) => d.id)
        .distance((d) => 35 + d.position * 5) // higher-ranked (smaller position) => shorter edges
        .strength(0.5)
    )
    .force(
      "bookLinks",
      d3
        .forceLink(sharedBookLinks)
        .id((d) => d.id)
        .distance(50)
        .strength((d) => Math.min(d.strength * 0.2, 0.5))
    )
    .force("charge", d3.forceManyBody().strength(-45))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force(
      "collision",
      d3.forceCollide((d) =>
        d.type === "book" ? radiusScale(d.votes) + 2 : 5
      )
    );

  // ---- Draw links ----
  const link = container
    .append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", (d) => (d.position <= 3 ? "#ffffff" : "#666"))
    .attr("stroke-opacity", 0.3)
    .attr("stroke-width", 0.8);

  // ---- Draw nodes ----
  const node = container
    .append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", (d) => (d.type === "book" ? radiusScale(d.votes) : 3))
    .attr("fill", (d) => {
      if (d.type === "voter") return "#4dabf7";
      return d.top100 ? "#dd1c77" : "#c994c7";
    })
    .attr("fill-opacity", (d) => {
      if (d.type === "voter") return 0.8;
      return d.top100 ? 1 : 0.45;
    })
    .call(drag(simulation))
    .on("mouseover", highlight)
    .on("mouseout", resetHighlight);

  // ---- Labels ----
  const label = container
    .append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .text((d) => d.id)
    .attr("paint-order", "stroke")
    .attr("stroke", "#111")
    .attr("stroke-width", 2)
    .attr("stroke-linejoin", "round")
    .style("opacity", (d) => (d.type === "book" && d.votes > 8 ? 1 : 0));

  // ---- Tick: update positions ----
  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

    // Place labels on a radial offset from the centre
    label
      .attr("x", (d) => {
        const angle = Math.atan2(d.y - height / 2, d.x - width / 2);
        const offset = d.type === "book" ? radiusScale(d.votes) + 8 : 10;
        return d.x + Math.cos(angle) * (offset + 4);
      })
      .attr("y", (d) => {
        const angle = Math.atan2(d.y - height / 2, d.x - width / 2);
        const offset = d.type === "book" ? radiusScale(d.votes) + 8 : 10;
        return d.y + Math.sin(angle) * offset;
      })
      .attr("text-anchor", (d) => (d.x < width / 2 ? "end" : "start"))
      .attr("dominant-baseline", "middle");
  });

  // ---- Interactions ----
  function highlight(event, d) {
    node
      .transition()
      .duration(150)
      .style("opacity", (o) => (isConnected(d, o) ? 1 : 0.08));

    label
      .transition()
      .duration(150)
      .style("opacity", (o) => (isConnected(d, o) ? 1 : 0))
      .attr("fill", (o) => (o.id === d.id ? "#ffffff" : "#d9d9d9"));

    link
      .style("stroke-width", (o) => {
        if (o.source.id === d.id || o.target.id === d.id) {
          return edgeWidthScale(o.position);
        }
        return 0.5;
      })
      .style("stroke-opacity", (o) =>
        o.source.id === d.id || o.target.id === d.id ? 0.9 : 0.03
      )
      .style("stroke", (o) => {
        if (o.source.id === d.id || o.target.id === d.id) {
          return o.position <= 3 ? "#ffffff" : "#999";
        }
        return "#444";
      });
  }

  function resetHighlight() {
    node.transition().duration(150).style("opacity", 1);

    label
      .transition()
      .duration(150)
      .style("opacity", (d) => (d.type === "book" && d.votes > 8 ? 1 : 0));

    link
      .style("stroke-width", 0.8)
      .style("stroke-opacity", 0.3)
      .style("stroke", (d) => (d.position <= 3 ? "#ffffff" : "#666"));
  }

  function drag(simulation) {
    return d3
      .drag()
      .on("start", (event, d) => {
        // Prevent drag from also triggering zoom/pan
        event.sourceEvent.stopPropagation();

        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }
});
