"""Reproduce the existing card-reference contract in a new, offline PostgreSQL cluster.

Uses postgres single-user mode: no listener, existing database, application env,
website session, or model. Production sources are read, never modified.
"""
import difflib
import hashlib
import json
import re
import subprocess
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
BIN = Path('/opt/homebrew/opt/postgresql@17/bin')
sql_path = ROOT / 'drizzle/0001_account_integrity.sql'
sql = sql_path.read_text()
function = re.search(r'CREATE FUNCTION check_owned_reference\(\).*?END \$\$;', sql, re.S).group(0)
trigger = next(line for line in sql.splitlines() if line.startswith('CREATE TRIGGER check_unified_cards_context_id '))
page_path = ROOT / 'src/app/event-library/[id]/page.tsx'
page = page_path.read_text()
assert 'getCards("event_case", c.id)' in page and 'contextType="event_case"' in page
updated = page.replace('getCards("event_case", c.id)', 'getCards("event", c.id)').replace('contextType="event_case"', 'contextType="event"')
assert updated.count('event_case') == page.count('event_case') - 2
patch = ''.join(difflib.unified_diff(page.splitlines(True), updated.splitlines(True), fromfile='a/src/app/event-library/[id]/page.tsx', tofile='b/src/app/event-library/[id]/page.tsx'))
(HERE / 'event-card-context.proposed.patch').write_text(patch)

def success(label, statement):
    return f"DO $$ BEGIN {statement}; RAISE WARNING 'RL_AUDIT|{label}|accepted'; END $$;"

def rejected(label, statement):
    return f"DO $$ BEGIN BEGIN {statement}; RAISE EXCEPTION 'EXPECTED_REJECTION_NOT_OBSERVED'; EXCEPTION WHEN foreign_key_violation THEN RAISE WARNING 'RL_AUDIT|{label}|rejected_23503|%', SQLERRM; END; END $$;"

commands = [
    'CREATE TABLE event_cases (id integer primary key, "userId" text);',
    'CREATE TABLE execution_boundaries (id integer primary key, "userId" text);',
    'CREATE TABLE tree_tasks (id integer primary key, "userId" text);',
    'CREATE TABLE unified_cards (id serial primary key, "userId" text, context_id integer, context_type text);',
    "INSERT INTO event_cases VALUES (1,'owner-a'),(2,'owner-b');",
    "INSERT INTO execution_boundaries VALUES (1,'owner-a');",
    "INSERT INTO tree_tasks VALUES (1,'owner-a');",
    re.sub(r'\s+', ' ', function),
    trigger,
    rejected('current_event_page_namespace', "INSERT INTO unified_cards (\"userId\",context_id,context_type) VALUES ('owner-a',1,'event_case')"),
    success('canonical_event_namespace', "INSERT INTO unified_cards (\"userId\",context_id,context_type) VALUES ('owner-a',1,'event')"),
    rejected('foreign_account_event', "INSERT INTO unified_cards (\"userId\",context_id,context_type) VALUES ('owner-b',1,'event')"),
    rejected('missing_event', "INSERT INTO unified_cards (\"userId\",context_id,context_type) VALUES ('owner-a',999,'event')"),
    success('existing_boundary_namespace', "INSERT INTO unified_cards (\"userId\",context_id,context_type) VALUES ('owner-a',1,'boundary')"),
    success('existing_task_namespace', "INSERT INTO unified_cards (\"userId\",context_id,context_type) VALUES ('owner-a',1,'task')"),
]
with tempfile.TemporaryDirectory(prefix='ruleloop-reference-probe-', dir='/private/tmp') as work:
    data = Path(work) / 'data'
    init = subprocess.run([str(BIN/'initdb'),'-D',str(data),'--auth=trust','--locale=C','--encoding=UTF8','--no-sync'], capture_output=True, text=True, timeout=40)
    (HERE/'initdb.log').write_text(init.stdout+init.stderr)
    if init.returncode:
        raise RuntimeError('Isolated initdb failed; see initdb.log')
    run = subprocess.run([str(BIN/'postgres'),'--single','-D',str(data),'-c','fsync=off','postgres'], input='\n'.join(commands)+'\n', capture_output=True, text=True, timeout=30)
    log = run.stdout+run.stderr
    (HERE/'reference-probe.log').write_text(log)
    results = [{'case':m.group(1),'result':m.group(2),'detail':m.group(3) or None} for m in re.finditer(r'RL_AUDIT\|([^|\n]+)\|([^|\n]+)(?:\|([^\n]+))?',log)]
    if run.returncode or len(results)!=6 or 'ERROR:' in log or 'FATAL:' in log:
        raise RuntimeError('Reference probe did not prove all six cases; inspect reference-probe.log')
    assert results[0]['result']=='rejected_23503' and 'Unsupported internal reference' in results[0]['detail']
    report = {'scope':'Actual copied migration function and trigger in isolated PostgreSQL single-user mode; not production or full application acceptance', 'checks':results,'sourceHashes':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [sql_path,page_path]},'productionFilesModified':False,'proposedPatchApplied':False,'existingClusterRestarted':False,'temporaryClusterRemoved':True,'postgresVersion':subprocess.check_output([str(BIN/'postgres'),'--version'],text=True).strip()}
    (HERE/'reference-probe.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'databaseChecks':len(results),'currentNamespace':'rejected_23503','canonicalNamespace':'accepted','patchApplied':False}))
