const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require('@octokit/rest');

const JiraApi = require('jira-client');

let jira;

const INVALID_TICKET = 'invalid';

const getIssueDescription = async (issueNumber) => {
  try {
    const ticket = await jira.findIssue(issueNumber);

    return ticket.fields.summary;
  } catch (e) {
    return INVALID_TICKET;
  }
}
async function extractJiraIssues() {
  try {
    console.log('called jira');
    const OUTPUT_KEY = 'issues';
    const token = core.getInput('token');
    const jiraToken = core.getInput('jiraToken');
    const jiraUsername = core.getInput('jiraUsername');
    const isPr = core.getInput('isPr');
    const prNumber = core.getInput('pullRequestNumber');
    const octokit = new Octokit({ auth: token });
    const { context } = github;
    const jiraRegex = /[A-Z]+(?!-?[a-zA-Z]{1,10})-\d+/g;


    jira = new JiraApi({
      protocol: 'https',
      host: 'myposter.atlassian.net',
      username: jiraUsername,
      password: jiraToken,
    });

    let commits;

    if (! isPr) {
      const { data: commitsPulls } = await octokit.rest.pulls.listCommits({
        pull_number: prNumber.toString(),
        owner: context.repo.owner,
        repo: context.repo.repo,
        per_page: 100
      });

      commits = commitsPulls;
    } else {
      const { payload: commitsCompareBranch } = await octokit.rest.repos.compareCommitsWithBasehead({
        owner: context.repo.owner,
        repo: context.repo.repo,
        per_page: 100,
        basehead: 'develop...master'
      });
      console.log(commitsCompareBranch);
      commits = commitsCompareBranch;
    }


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
        const linkedIssues = await Promise.all(issues.map(async (issue) => {
          const description = await getIssueDescription(issue);

          if (description === INVALID_TICKET) {
            return `${issue} existiert nicht`;
          }

          return `<https://myposter.atlassian.net/browse/${issue}|${issue} ${description}>`
        }));

        const output = linkedIssues.join('\n').replace('\\n', '\n');

        core.setOutput(OUTPUT_KEY, output);
      } else {
        core.setOutput(OUTPUT_KEY, 'false');
      }
    } else {
      core.setOutput(OUTPUT_KEY, 'false');
    }

  } catch (error) {
    console.log('error');
    core.setFailed(error.message);
  }
}

(async function () {
  await extractJiraIssues();
})();
