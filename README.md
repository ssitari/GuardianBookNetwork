## Guardian Top 100 Best Novels Network Vizualization

After reading the [Guardian Top 100 Best Novels of All Time](https://www.theguardian.com/books/ng-interactive/2026/may/12/the-100-best-novels-of-all-time) results, I stumbled across [Matthew Aldridge's blog entry](https://mpaldridge.github.io/blog/guardian-novels.html) where he reveals that he scraped the raw vote totals and cleaned up the voting data.

Since I have been using Claude to learn a little D3 I thought the [voting table he published](https://github.com/mpaldridge/guardian-100-novels/blob/main/votes.csv) would make for a fun network visualization.

I published the results through [Github Pages](https://ecg2104.github.io/GuardianBookNetwork/)

In the article 172 writers and critics submitted ballots ranking 10 novels as "greatest."  The Guardian ranked only the top 100 novels, however Aldridge's list tabulates scores for all 683 novels that received a vote and I include all here.  In the graph, nodes represent all novels receiving a vote and are connected to nodes representing any voter who cast a ballot for it.  The size of novel nodes is scaled by the book's vote total.  All edges represent a single vote, but there is a weighting by vote position so that voters should be drawn towards the novels they rate most highly.  Thus, voters with relatively orthodox ballots and novels with higher vote scores will have a more central location.  Voters with more unorthodox votes will be more peripherally located, as will novels with few votes.  Novels that got multiple votes, but from voters with otherwise unorthodox ballots may be pulled more peripherally as well.  Hovering over a node will foreground all edges and node relations as will selecting a voter or novel node from the pull down menus.  There is also an author menu that will highlight all novels and votes for that writer.


## Acknowledgements
The network graphic was constructed using voter data compiled by [Matthew Aldridge](https://github.com/mpaldridge) from his [guardian-100-novels](https://github.com/mpaldridge/guardian-100-novels) repository.

Original dataset licensed under Apache License 2.0.

Modifications: I edited and reformated the Author names so they could be displayed and sorted by surname and added an indicator for topp 100 status.

Also see his blog:

Aldridge, M. (2026, May 17). Guardian 100 best novels (stats and errors). Matthew Aldridge. https://mpaldridge.github.io/blog/guardian-novels.html

Original Guardian story:

The Guardian. (2026, May 16). The 100 best novels of all time. https://www.theguardian.com/books/ng-interactive/2026/may/16/story-behind-100-best-novels-all-time

Built with the JavaScript library D3.js.

Portions of the JavaScript and CSS were developed with assistance from the Claude chatbot
