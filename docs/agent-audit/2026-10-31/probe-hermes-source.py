"""Check pinned source identity and execute only its pure terminal-status function.

Does not import Hermes, install dependencies, run a gateway, or send model requests.
"""
import ast
import hashlib
import json
from pathlib import Path

HERE=Path(__file__).resolve().parent
META=Path('/private/tmp/ruleloop-hermes-interface-audit-20261031/版本与证据.json')
SOURCE=Path('/private/tmp/ruleloop-hermes-source-20261031')
meta=json.loads(META.read_text())
verified=[]
for item in meta['sources']:
    file=SOURCE/Path(item['path']).name
    if not file.exists():
        continue
    raw=file.read_bytes()
    actual=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
    assert actual==item['gitBlobSha'],item['path']
    verified.append({'path':item['path'],'gitBlobSha':actual,'sourceUrl':item['url']})
source=SOURCE/'api_server_runs.py'
tree=ast.parse(source.read_text())
function=next(node for node in tree.body if isinstance(node,ast.FunctionDef) and node.name=='terminal_run_status')
module=ast.Module(body=[ast.ImportFrom(module='__future__',names=[ast.alias(name='annotations')],level=0),function],type_ignores=[])
namespace={}
exec(compile(ast.fix_missing_locations(module),str(source),'exec'),namespace)
cases=[
    ('completed',{'completed':True},'completed'),
    ('partial_with_text',{'partial':True,'final_response':'some text'},'failed'),
    ('explicit_failure',{'failed':True},'failed'),
    ('explicit_not_completed',{'completed':False},'failed'),
    ('iteration_budget',{'partial':True,'turn_exit_reason':'iteration_budget_exhausted'},'failed'),
    ('interrupted_with_text',{'interrupted':True,'final_response':'some text'},'cancelled'),
    ('missing_completion_marker',{},'completed'),
]
results=[]
for name,value,expected in cases:
    status,fields=namespace['terminal_run_status'](value)
    assert status==expected
    results.append({'case':name,'input':value,'status':status,'fields':fields})
report={'scope':'Verified local files against recorded pinned Git blobs, then executed one extracted pure function; no complete-runtime or HTTP claim','inspectionCommit':meta['inspectionCommit'],'deploymentVersionSelected':False,'verifiedSourceFiles':verified,'results':results,'importantBoundary':'At this pinned source, the internal pure function treats an empty result as completed. RuleLoop must still require a valid run identity, authenticated terminal status, schema-valid output, sources and current business context before allowing adoption. Do not interpret an arbitrary empty API response as completion.'}
(HERE/'hermes-source-probe.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'verifiedSourceBlobs':len(verified),'pureTerminalCases':len(results),'gatewayStarted':False,'modelCalls':0}))
