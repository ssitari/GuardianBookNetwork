const svg = d3.select("svg")
const container = svg.append("g")

const width = window.innerWidth
const height = window.innerHeight

svg
  .attr("width", width)
  .attr("height", height)

  const zoom = d3.zoom()
  .scaleExtent([0.1, 8])
  .on("zoom", (event) => {
    container.attr("transform", event.transform)
  })

svg.call(zoom)

d3.csv("guardian_votes.csv").then(rows => {

  const nodesMap = new Map()
  const links = []
  const ballots = {}

  rows.forEach(row => {

    const voter = row.voter.trim()
    const book = row.book.trim()

        if (!ballots[voter]) {
      ballots[voter] = []
    }

ballots[voter].push(book)

    if (!nodesMap.has(voter)) {
      nodesMap.set(voter, {
        id: voter,
        type: "voter"
      })
    }

    if (!nodesMap.has(book)) {
      nodesMap.set(book, {
        id: book,
        type: "book"
      })
    }

    links.push({
      source: voter,
      target: book
    })
  })

  const sharedBookLinks = []
  const pairCounts = {}
  const voteCounts = {}

  Object.values(ballots).forEach(bookList => {

  for (let i = 0; i < bookList.length; i++) {

    for (let j = i + 1; j < bookList.length; j++) {

      const a = bookList[i]
      const b = bookList[j]

      const key =
        a < b
          ? `${a}|${b}`
          : `${b}|${a}`

      pairCounts[key] =
        (pairCounts[key] || 0) + 1
    }
  }
})

Object.entries(pairCounts).forEach(([key, count]) => {

  // ignore weak relationships
  if (count < 8) return

  const [source, target] = key.split("|")

  sharedBookLinks.push({
    source,
    target,
    strength: count
  })
})

links.forEach(link => {

  voteCounts[link.target] =
    (voteCounts[link.target] || 0) + 1
})

  const nodes = Array.from(nodesMap.values()).map(node => {

  if (node.type === "book") {
    node.votes = voteCounts[node.id] || 1
  } else {
    node.votes = 1
  }

  return node
  })

  const maxVotes = d3.max(nodes, d => d.votes)

  const radiusScale = d3.scaleSqrt()
    .domain([1, maxVotes])
    .range([3, 22])

  const linkedByIndex = {}

links.forEach(d => {
  linkedByIndex[`${d.source},${d.target}`] = true
  linkedByIndex[`${d.target},${d.source}`] = true
})

function isConnected(a, b) {
  return (
    linkedByIndex[`${a.id},${b.id}`] ||
    linkedByIndex[`${b.id},${a.id}`] ||
    a.id === b.id
  )
}

const simulation = d3.forceSimulation(nodes)

  .force(
    "link",
    d3.forceLink(links)
      .id(d => d.id)
      .distance(70)
  )

  .force(
    "bookLinks",
    d3.forceLink(sharedBookLinks)
      .id(d => d.id)
      .distance(50)
      .strength(d =>
        Math.min(d.strength * 0.2, 0.5)
      )
  )

  .force("charge",
    d3.forceManyBody().strength(-45)
  )

  .force("center",
    d3.forceCenter(width / 2, height / 2)
  )

  .force(
    "collision",
    d3.forceCollide(d =>
      d.type === "book"
        ? radiusScale(d.votes) + 2
        : 5
    )
  )

  const link = container
    .append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", "#888")
    .attr("stroke-opacity", 0.3)

  const node = container
    .append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", d =>
      d.type === "book"
        ? radiusScale(d.votes)
        : 3
    )
    .attr("fill", d =>
      d.type === "book"
        ? "#ff6b6b"
        : "#4dabf7"
    )
    .call(drag(simulation))
  .on("mouseover", highlight)
  .on("mouseout", resetHighlight)

  const label = container
    .append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .text(d => d.id)
    .style("opacity", d => {

      if (d.type === "book" && d.votes > 8) {
        return 1
      }

      return 0
    })

  simulation.on("tick", () => {

    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y)

    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)

    label
      .attr("x", d => d.x + 8)
      .attr("y", d => d.y + 3)
  })

  function highlight(event, d) {

  node.style("opacity", o =>
    isConnected(d, o) ? 1 : 0.08
  )

  label.style("opacity", o =>
  isConnected(d, o) ? 1 : 0
)


  link
    .style("stroke-opacity", o =>
      o.source.id === d.id || o.target.id === d.id
        ? 0.9
        : 0.03
    )
    .style("stroke", o =>
      o.source.id === d.id || o.target.id === d.id
        ? "#ffffff"
        : "#666"
    )
}

function resetHighlight() {

  node.style("opacity", 1)

  label.style("opacity", d =>
  (d.type === "book" && d.votes > 8)
    ? 1
    : 0
)

  link
    .style("stroke-opacity", 0.3)
    .style("stroke", "#888")
}

  function drag(simulation) {

    return d3.drag()

  .on("start", (event, d) => {

    event.sourceEvent.stopPropagation()

    if (!event.active)
      simulation.alphaTarget(0.3).restart()

    d.fx = d.x
    d.fy = d.y
  })

  .on("drag", (event, d) => {
    d.fx = event.x
    d.fy = event.y
  })

  .on("end", (event, d) => {

    if (!event.active)
      simulation.alphaTarget(0)

    d.fx = null
    d.fy = null
  })
  }

})
