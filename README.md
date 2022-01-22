# extract-jira-tickets-action

## usecase
Extract JIRA issues from git history (only pull request commits). Why no action from marketplace? We'd like to map the keys to our JIRA board url.

##usage
```yaml
      - name: 🎟️ detect tickets
        uses: myposter-de/extract-jira-tickets-action@master
        id: issues
        with:
          token: ${{ secrets.GH_PAT }}
```

The found issues will be available by

```yaml
${{ steps.issues.outputs.issues }}
```
