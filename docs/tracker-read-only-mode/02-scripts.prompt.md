Implement **docs/tracker-read-only-mode phase 2 only**.

Read docs/tracker-read-only-mode/prompt.md. Phase **1** must be `done`.

Implement docs/tracker-read-only-mode/02-scripts.md. Mirror the change in `jira` and `ado`; if one shared helper fits both without breaking the existing script layout, prefer it **(Recommended)**, otherwise duplicate the small guard. Reuse the existing `artifactsOnTrackerOnly: false` file-reading path for `get`.

Run `node --test scripts/jira.test.js scripts/ado.test.js`, then `npm test`. Report actual output.

Do not edit README unless I ask. Do not commit unless I ask.

Update phase **2** Status when done.
