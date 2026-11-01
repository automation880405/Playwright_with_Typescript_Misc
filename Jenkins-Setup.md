# Jenkins setup and Playwright pipeline

This guide explains how to connect this repository to Jenkins, what the
pipeline does during a build, and where to find test results and reports.

## What the pipeline does

The declarative pipeline is defined in [`Jenkinsfile`](./Jenkinsfile). For
each build it:

1. Checks out the source revision configured for the Jenkins job.
2. Installs the exact Node.js dependencies recorded in `package-lock.json`.
3. Installs the Playwright Chromium browser.
4. Runs the Chromium Playwright test suite in CI mode.
5. Publishes JUnit test results and archives generated reports, even if an
   earlier stage failed.

The pipeline uses Windows `bat` commands. It therefore needs to run on a
Windows Jenkins agent with Node.js, npm, and Git available to the account that
runs the Jenkins agent.

## Jenkins and agent prerequisites

- A Jenkins controller that can run Pipeline jobs.
- A Windows agent (or a Windows controller configured to accept builds).
- Git installed and available on the agent's `PATH`.
- Node.js and npm installed and available on the agent's `PATH`.
- Network access from the agent to the Git repository, npm registry, Playwright
  browser download endpoints, and `https://the-internet.herokuapp.com/`.
- The **JUnit Plugin** to display the published test results in Jenkins.

The pipeline uses Jenkins' Pipeline functionality and built-in artifact
archiving. If the Jenkins instance has a pool of both Windows and non-Windows
agents, `agent any` could select an incompatible agent. In that case, assign a
Windows label to the agent and change the pipeline's agent declaration to use
that label.

## Create a Pipeline job

1. Make sure `Jenkinsfile` is committed to the branch Jenkins will build.
2. In Jenkins, select **New Item**, enter a job name, choose **Pipeline**, and
   select **OK**.
3. Under **Pipeline**, set **Definition** to **Pipeline script from SCM**.
4. Choose **Git** as the SCM and enter the repository URL.
5. Select the branch or branch pattern to build (for example, `*/main`).
6. If the repository is private, select or add Jenkins-managed repository
   credentials. Do not put credentials in the Jenkinsfile or commit them to the
   repository.
7. Set **Script Path** to `Jenkinsfile`.
8. Save the job and select **Build Now** to run a first build.

This pipeline does not configure a trigger. **Build Now** starts a build
manually. To build automatically after pushes or pull requests, configure the
appropriate webhook or multibranch Pipeline behavior in Jenkins and in your
Git hosting service.

## Agent setup details

The commands in the Jenkinsfile are Windows batch commands:

```groovy
bat 'npm ci'
bat 'npx playwright install chromium'
bat 'npm run test:ci'
```

Install Node.js on the Windows agent and make sure both `node` and `npm` work
from the agent's environment. Jenkins runs builds under the agent service
account, not necessarily the account used to install Jenkins interactively.
Check the `PATH` and permissions for that service account if a command works
in a normal terminal but fails in Jenkins.

Playwright downloads Chromium for the account running the build. Its browser
cache can be separate from the cache of an administrator or interactive user.
The `playwright install chromium` step is therefore part of each build; the
browser files may be reused from that account's cache on later builds.

## What happens during a build

### 1. Checkout

`checkout scm` checks out the revision selected by the Jenkins job into the
build workspace. Jenkins runs later commands from that workspace, where
`package.json`, `package-lock.json`, `Jenkinsfile`, and the tests are available.

### 2. Install dependencies

`npm ci` installs dependencies from `package-lock.json`. Unlike `npm install`,
it is intended for reproducible CI installs and fails if the lockfile does not
match `package.json`.

`npx playwright install chromium` downloads the Chromium browser build expected
by the installed Playwright version. The pipeline only installs Chromium
because `test:ci` runs the `chromium` project.

### 3. Run tests in CI mode

The Jenkinsfile sets `CI=true` for the whole pipeline. The `test:ci` script in
[`package.json`](./package.json) runs:

```text
playwright test --project=chromium
```

The Playwright configuration in [`playwright.config.ts`](./playwright.config.ts)
uses the `CI` environment variable to:

- run the browser headlessly;
- use one worker to avoid parallel test execution on CI;
- retry failed tests up to two times; and
- fail the run if a test uses `test.only`.

The configured tests use `https://the-internet.herokuapp.com/`, so the agent
needs network access to that external site. A test failure caused by the site
being unavailable can look like an application/test failure in Jenkins.

### 4. Generate reports

Playwright has three configured reporters:

- **List** prints test progress and failures in the Jenkins console log.
- **JUnit** writes `test-results/junit.xml`. Jenkins reads this file to show
  test counts and failure details on the build page.
- **HTML** writes the report to `playwright-report/` and does not try to open a
  browser on the agent.

Playwright also places test output and failure attachments, such as screenshots
and traces when available, under `test-results/`.

### 5. Publish results, including after failure

The pipeline's `post { always { ... } }` block runs its reporting steps whether
the tests pass or fail:

- `junit` imports `test-results/junit.xml`. `allowEmptyResults: true` prevents
  the reporting step itself from failing when the XML file was never created
  (for example, if dependency installation failed before tests ran).
- `archiveArtifacts` saves files from `playwright-report/` and `test-results/`
  with the Jenkins build. `allowEmptyArchive: true` avoids an additional
  failure when an earlier stage stopped before reports existed.

The test command still fails the build when tests fail. Publishing reports in
the `always` block makes the diagnostic output available despite that failure.
Jenkins may show a test-failing build as **Unstable** after processing JUnit
results; an unsuccessful test command can also make the overall build fail.

## View the results

1. Open the Jenkins job and select the build number in **Build History**.
2. Select **Test Result** to view the JUnit summary and failed test details.
   This link requires the JUnit Plugin and a generated JUnit XML file.
3. Select **Console Output** to see the pipeline stages and Playwright's
   reporter output.
4. Select **Artifacts** to download files archived from `playwright-report/`
   and `test-results/`.
5. To view the full Playwright HTML report, download the `playwright-report`
   artifact and open its `index.html` locally.

The current Jenkinsfile archives the HTML report but does not publish it as an
HTML page inside Jenkins. That requires an additional Jenkins plugin and a
`publishHTML` pipeline step; it is not part of the current setup.

## Local runs versus Jenkins

From a local terminal, `npm test` runs the configured Playwright tests. With no
`CI` environment variable, Chromium is launched headed and maximized by the
current configuration.

To exercise the same CI command locally in PowerShell:

```powershell
$env:CI = 'true'
npm run test:ci
```

This runs Chromium headlessly and produces the same JUnit and HTML report
directories. Remove the variable from that PowerShell session with
`Remove-Item Env:CI` if you want to return to the local headed behavior.

## Troubleshooting

| Symptom | What to check |
|---|---|
| `bat` is not recognized or a shell step fails immediately | The build ran on a non-Windows agent. Configure a Windows agent/label. |
| `npm` or `npx` is not recognized | Install Node.js for the Jenkins agent account and ensure its `PATH` includes Node.js. |
| Git checkout fails | Check the repository URL, branch, agent network access, and Jenkins-managed credentials. |
| Playwright cannot launch Chromium | Check that `npx playwright install chromium` completed successfully and that the agent account can write to its browser cache. |
| Navigation or tests time out | Check outbound network access to the external test site and whether that site is responding. |
| No **Test Result** link appears | Confirm the JUnit Plugin is installed and inspect the console log for JUnit publishing messages. If the build failed before tests started, no JUnit file may exist. |
| No report appears under **Artifacts** | Check the console log and confirm that `playwright-report/` or `test-results/` was generated in the build workspace. |
| Tests pass locally but fail in Jenkins | Reproduce with `CI=true`, then compare Node.js versions, network access, and the Jenkins service account's environment. |

Generated reports and test results are ignored by Git via [`.gitignore`](./.gitignore);
Jenkins stores them as build data rather than source files.
