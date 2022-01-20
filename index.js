const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require('@octokit/rest');

async function extractJiraIssues() {
  try {
    const OUTPUT_KEY = 'issues';
    const token = core.getInput('token');
    const octokit = new Octokit({ auth: token });
    const { context } = github;
    const jiraRegex = /[A-Z]+(?!-?[a-zA-Z]{1,10})-\d+/g;

    const { data: commits } = await octokit.rest.pulls.listCommits({
      pull_number: context.payload.pull_request.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
    });

    const issues = commits.match(jiraRegex);

    if (issues) {
      let uniqueIssues = issues.filter((val, index, arr) => arr.indexOf(val) === index);
      uniqueIssues = uniqueIssues.map(issue => `<https://myposter.atlassian.net/browse/${issue}|${issue}>`)

      const output = uniqueIssues.join(' ');

      core.setOutput(OUTPUT_KEY, output);
    } else {
      core.setOutput(OUTPUT_KEY, '');
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

(async function () {
  await extractJiraIssues();
})();
