const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require('@octokit/rest');

async function extractJiraIssues() {
  try {
    const OUTPUT_KEY = 'issues';
    const token = core.getInput('token');
    const prNumber = core.getInput('pullRequestNumber');
    const octokit = new Octokit({ auth: token });
    const { context } = github;
    const jiraRegex = /[A-Z]+(?!-?[a-zA-Z]{1,10})-\d+/g;

    const { data: commits } = await octokit.rest.pulls.listCommits({
      pull_number: prNumber || context.payload.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
    });

    if (commits) {
      const issues = [];
      commits.forEach(item => {
        const { message } = item.commit;
        const matchedIssues = message.match(jiraRegex);

        if (matchedIssues?.length) {
          matchedIssues.forEach(matchedIssue => {
            if (!issues.find(issue => issue === matchedIssue)) {
              issues.push(matchedIssue);
            }
          });
        }
      });
      if (issues) {
        const linkedIssues = issues.map(issue => `<https://myposter.atlassian.net/browse/${issue}|${issue}>`)

        const output = linkedIssues.join('\n').replace('\\n', '\n');

        core.setOutput(OUTPUT_KEY, output);
      } else {
        core.setOutput(OUTPUT_KEY, '');
      }
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
