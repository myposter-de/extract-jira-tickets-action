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
    const prNumber = core.getInput('pullRequestNumber');
    const compareToLatestTag = core.getInput('latestTag');
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

    console.log('context.repo', context.repo);

    if (compareToLatestTag === 'false') {
      console.log('rest.pulls.listCommits with number ', prNumber);
      const { data: commitsPulls } = await octokit.rest.pulls.listCommits({
        pull_number: prNumber,
        owner: context.repo.owner,
        repo: context.repo.repo,
        per_page: 100
      });

      console.log('pull', commitsPulls);

      commits = commitsPulls;
    } else {
      console.log('compare branches');

      let { data: tags } = await octokit.rest.repos.listTags({
        owner: context.repo.owner,
        repo: context.repo.repo,
      });

      tags = tags.filter(tag => tag.name.includes('helm-version'));

      const latestTagToUse = tags[0]?.name;

      console.log('latestTagToUse: ', latestTagToUse);

      if (!latestTagToUse) {
        core.setFailed('could not find latestTag');
        return;
      }

      const { data: commitsCompareBranch } = await octokit.request(`GET /repos/${context.repo.owner}/${context.repo.repo}/compare/${latestTagToUse}...HEAD`);

      commits = commitsCompareBranch.commits;
    }

    console.log('commits: ', commits);

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

        console.log('linkedIssues ', linkedIssues);

        if (linkedIssues?.length) {
          const output = linkedIssues.join('\n').replace('\\n', '\n');

          if (output && output !== '\n') {
            core.setOutput(OUTPUT_KEY, output ?? '');
          } else {
            core.setOutput(OUTPUT_KEY, '');
          }
        }
      } else {
        core.setOutput(OUTPUT_KEY, '');
      }
    } else {
      core.setOutput(OUTPUT_KEY, '');
    }

  } catch (error) {
    console.log('error');
    core.setFailed(error);
  }
}

(async function () {
  await extractJiraIssues();
})();
