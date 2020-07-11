// Check if current user has voted
document.addEventListener("mv-login", async evt => {
	let app = Mavo.all.mavoice;
	app.root.children.username = evt.backend.username;

	let repo = app.root.children.repo.value;
	let [owner, repoName] = repo.split("/");
	let labels = app.root.children.labels.value;

	let query = `query {
		repository(owner:"${owner}", name:"${repoName}") {
			issues(first:100, states:OPEN, labels:"${labels}", orderBy:{field: COMMENTS, direction: DESC}) {
				edges {
					node {
						number
						hasVoted: reactions(content:THUMBS_UP) {
							viewerHasReacted
						}
					}
				}
			}
		}
	}`;

	let json = await app.storage.get(Mavo.Backend.Github.apiDomain + "graphql#" + query);

	let arr = await json.repository.issues.edges.map(n => n.node);

	arr.forEach(n => {
		n.hasVoted = n.hasVoted.viewerHasReacted;
		var issue = $("#issue" + n.number);

		if (issue) {
			$(".votes button", issue).classList.toggle("pressed", n.hasVoted);
		}
	});
});

Mavo.hooks.add("render-start", ({data}) => {
	// Sort data properly
	if (data) {
		data = data.sort((a, b) => b.reactions["+1"] - a.reactions["+1"]);
	}
})

// Enables the vote button
$.delegate(document, "click", ".votes button", evt => {
	var app = Mavo.all.mavoice;
	var github = app.storage;

	var issue = evt.target.closest("article");
	var node = Mavo.Node.get(issue);
	var url = new URL($(".content > a", issue).href);
	url.pathname = "/repos" + url.pathname + "/reactions";
	url.hostname = "api." + url.hostname;

	var hasVoted = evt.target.classList.contains("pressed");

	app.inProgress = "Voting";
	var headers = {
		headers: {
			"Accept": "application/vnd.github.squirrel-girl-preview"
		}
	};

	github.login()
		.then(() => github.request(url, {"content": "+1"}, "POST", headers))
		.then(data => {
			if (hasVoted) {
				// Remove vote
				return github.request(Mavo.Backend.Github.apiDomain + "reactions/" + data.id, null, "DELETE", headers).then(() => {
					node.children.votes.value--;
					evt.target.classList.remove("pressed");
					app.inProgress = false;
				});
			}
			else {
				// Created vote
				node.children.votes.value++;
				evt.target.classList.add("pressed");
				app.inProgress = false;
			}
		});
})
