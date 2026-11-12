"""Package the reviewed source files as additions, without applying them."""
import difflib
import hashlib
import json
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
files=["src/lib/agent/event-context.ts","src/lib/agent/event-context-repository.ts","src/lib/agent/event-analysis.ts"]
patch=[]
for relative in files:
    if (ROOT/relative).exists():
        raise RuntimeError(f"Target already exists; do not overwrite: {relative}")
    content=(HERE/relative).read_text()
    patch.extend(difflib.unified_diff([],content.splitlines(True),fromfile='/dev/null',tofile='b/'+relative))
(HERE/'context-candidate.proposed.patch').write_text(''.join(patch))
dependencies=["package.json","package-lock.json","src/db/schema.ts","src/db/index.ts","src/lib/action.ts","src/lib/user.ts","src/lib/domain/experience-trigger.ts","src/app/actions/event-library.ts","src/app/actions/rules.ts","drizzle/0000_initial_online_schema.sql","drizzle/0001_account_integrity.sql","drizzle/0002_agent_rule_sources.sql"]
digest=lambda file: hashlib.sha256(file.read_bytes()).hexdigest()
report=json.loads((HERE/'database-verification.json').read_text())
if report['failed'] or not report['typecheck']:
    raise RuntimeError('Candidate lacks successful final checks')
manifest={'state':'candidate_not_applied','files':{relative:digest(HERE/relative) for relative in files},'existingDependencies':{relative:digest(ROOT/relative) for relative in dependencies},'patchSha256':digest(HERE/'context-candidate.proposed.patch'),'validation':{'tests':report['passed'],'typecheck':report['typecheck']},'noNewBusinessTables':True,'noNewAuthentication':True,'modelCalls':0,'productionChanges':False}
(HERE/'candidate-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'candidateFiles':len(files),'tests':report['passed'],'patchApplied':False}))
