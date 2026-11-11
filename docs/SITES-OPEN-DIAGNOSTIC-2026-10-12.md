# Sites open failure investigation — 2026-10-12

Reported symptom: opening `sites-project://appgprj_6abcda16b59c8191a489fa13646161b0` briefly opens/closes or crashes. Exact affected surface is awaiting the user's clarification.

## Verified observations

- Native Sites API: project active, current user owner, not disabled; latest version 0.
- Version listing: empty.
- Live URL, preview URL and expected URL: null in the current response.
- Worker-log API: 409 `worker_logs_unavailable`; no production logs are available.
- Examined today's seven local desktop log files (recent tails); no matching Site exception or renderer crash was found.
- No Codex/ChatGPT-named crash reports were present in the inspected macOS DiagnosticReports directory.
- Installed desktop application: bundle `com.openai.codex`, version `26.1007.30912`, build `20156`.
- Read-only inspection of bundled client code confirms that the Sites list/open handler returns without opening a preview when the fetched `live_url` is null. The pending-preview handler also skips a null URL. These guards explain why an unpublished project has no usable website preview; they do not establish the reported panel closure or process crash. The installed application was not modified.
- Computer-use access to the Codex application is not permitted by that tool, so the reported UI behavior could not be directly reproduced.

## Interpretation and boundary

There is no deployed RuleLoop application version in this Site to patch or roll back. This does not prove that the absence of a version causes the reported open/close behavior. A desktop/client navigation failure, an empty-state issue and an error page require different diagnosis.

No source, deployment, access setting, local app installation, credential, cache or existing project identity was changed during this investigation. The issue is not marked fixed. Do not create a replacement project or publish unrelated placeholder content merely to mask the missing deployment.

Next discriminator: whole desktop application exits/restarts, only the Site panel closes, or the panel remains open with a blank/error page. Once known, inspect the relevant client/opening path or prepare the intended supported Site application rather than treating the symptom as an existing Worker crash.
