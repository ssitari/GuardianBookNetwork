# Guardian Top 100 Best Novels — Network Visualization

After reading the [Guardian Top 100 Best Novels of All Time](https://www.theguardian.com/books/ng-interactive/2026/may/12/the-100-best-novels-of-all-time) results, I came across [Matthew Aldridge's blog post](https://mpaldridge.github.io/blog/guardian-novels.html) where he reveals that he scraped the raw vote totals and cleaned up the voting data. Since I have been using Claude to learn a little D3, the [voting table he published](https://github.com/mpaldridge/guardian-100-novels/blob/main/votes.csv) seemed like a fun opportunity for a network visualization.

Built with [D3.js](https://d3js.org). No build step required — plain HTML, CSS, and ES modules.

[View on GitHub Pages](https://ssitari.github.io/GuardianBookNetwork/)

---

## What it does

- **Force-directed network** — nodes represent novels and voters, edges represent individual votes. The simulation pulls voters toward the novels they ranked most highly, so voters with orthodox tastes and highly-voted novels cluster centrally; voters with idiosyncratic ballots and niche novels drift to the periphery.
- **Node sizing** — novel nodes are scaled by total vote count (square-root scale). Voter nodes are uniform small circles.
- **Co-occurrence edges** — dashed purple edges connect pairs of novels that appeared together on 8 or more ballots, revealing clusters of books that critics tend to group together.
- **Top 100 distinction** — novels that made the final Top 100 are colored orange; novels that received votes but did not make the list are pale yellow.
- **Zoom-dependent labels** — novel labels appear and disappear based on zoom level and vote count, so the most-voted novels are always labeled at any zoom.
- **Filter by author, novel, or voter** — dropdown menus highlight the selected node and all its connections, fading everything else.
- **Hover and click** — hovering a node foregrounds its edges and neighbors; clicking locks the highlight and zooms the view to that node. Clicking the background or the node again releases it.
- **Tooltips** — novels show title, author, vote count, Top 100 status, and up to 5 voters with their ranking position; voters show how many novels they voted for and their top 5 picks with position.

---

## Interaction reference

| Action | Effect |
|---|---|
| Hover over a node | Foreground connected edges and neighbors; show tooltip |
| Click a node | Lock the highlight and zoom to that node |
| Click a locked node or the background | Release the highlight |
| Author / Novel / Voter dropdown | Filter the network to that selection |
| Clear button | Reset the filter |
| Reset zoom button | Return to the full network view |
| Scroll wheel | Zoom in/out |
| Drag (background) | Pan |
| Drag (node) | Reposition that node in the simulation |
| Panel toggle (▾/▸) | Collapse or show the controls panel |

---

## Network structure

Nodes:
- **Novel nodes** (circles scaled by vote count) — orange = Top 100; pale yellow = received votes but did not make the list
- **Voter nodes** (small blue circles) — one per critic/voter

Edges:
- **Vote edges** (solid lines) — one edge per vote, connecting a voter to a novel. Gold for top-3 ranked votes, grey for all others.
- **Co-occurrence edges** (dashed purple) — connect pairs of novels that appeared together on 8 or more ballots

Force layout:
- Vote edge distance is weighted by ballot position — top-ranked books are pulled closer to their voters
- Co-occurrence edges attract books that frequently appear on the same ballots
- Node repulsion and collision avoidance keep the layout readable

---

## Data

**Voting data:** Compiled by [Matthew Aldridge](https://github.com/mpaldridge) from the Guardian poll. Source: [guardian-100-novels](https://github.com/mpaldridge/guardian-100-novels/blob/main/votes.csv), licensed under Apache License 2.0.

Modifications: author names were edited and reformatted for display and sorting by surname; a Top 100 indicator was added.

**Original Guardian story:**
The Guardian. (2026, May 16). The 100 best novels of all time. https://www.theguardian.com/books/ng-interactive/2026/may/16/story-behind-100-best-novels-all-time

---

## Libraries

| Library | Use | License |
|---|---|---|
| [D3.js v7](https://d3js.org) | Visualization, force simulation | ISC |

---

## Acknowledgements

Voting data compiled by Matthew Aldridge:

> Aldridge, M. (2026, May 17). Guardian 100 best novels (stats and errors). *Matthew Aldridge.* https://mpaldridge.github.io/blog/guardian-novels.html

Most of the code written with assistance from [Claude](https://claude.ai) (Anthropic).

---

## License

Original dataset licensed under Apache License 2.0. Visualization code MIT — free to use, adapt, and redistribute with attribution.
