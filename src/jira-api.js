const JiraApi = require('jira-client');

let jira;

const getIssueDescription = async (issueNumber, token) => {
   if (!jira) {
      jira = new JiraApi({
         protocol: 'https',
         host: 'myposter.atlassian.net',
         username: 'martin.berchtold@myposter.de',
         password: token,
      });
   }
   const ticket = await jira.findIssue(issueNumber);

   return ticket.fields.summary;
}

module.exports = { getIssueDescription };
