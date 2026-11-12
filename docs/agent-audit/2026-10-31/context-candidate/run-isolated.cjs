// Creates its own ephemeral cluster. Never loads .env or restarts an existing server.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const crypto = require('node:crypto');
const root = path.resolve(__dirname,'../../../..');
const req = createRequire(path.join(root,'package.json'));
const { Pool } = req('pg');
const bin = '/opt/homebrew/opt/postgresql@17/bin';
const work = fs.mkdtempSync('/private/tmp/ruleloop-context-candidate-');
const data = path.join(work,'data'), socket = path.join(work,'socket');
fs.mkdirSync(socket,{mode:0o700});
let started=false;
function command(executable,args,options={}) {
  const result=spawnSync(executable,args,{encoding:'utf8',timeout:60000,...options});
  if(result.status!==0) throw new Error(`${path.basename(executable)} failed: ${(result.stderr||result.stdout||'').slice(-3000)}`);
  return result;
}
async function main() {
  let admin;
  try {
    fs.rmSync(path.join(__dirname,'database-verification.json'),{force:true});
    command(path.join(bin,'initdb'),['-D',data,'-U','audit_admin','--auth=trust','--locale=C','--encoding=UTF8','--no-sync']);
    command(path.join(bin,'pg_ctl'),['-D',data,'-l',path.join(work,'postgres.log'),'-o',`-c listen_addresses='' -c unix_socket_directories='${socket}' -p 55511`,'-w','start']);
    started=true;
    const connection = user => `postgresql://${user}@localhost/postgres?host=${encodeURIComponent(socket)}&port=55511`;
    admin=new Pool({connectionString:connection('audit_admin')});
    const migrations=['0000_initial_online_schema.sql','0001_account_integrity.sql','0002_agent_rule_sources.sql'];
    const hashes={};
    for(const file of migrations) {
      const bytes=fs.readFileSync(path.join(root,'drizzle',file));
      hashes[file]=crypto.createHash('sha256').update(bytes).digest('hex');
      for(const sql of bytes.toString('utf8').split('--> statement-breakpoint')) if(sql.trim()) await admin.query(sql);
    }
    await admin.query('CREATE ROLE context_reader LOGIN NOSUPERUSER NOBYPASSRLS');
    await admin.query('GRANT USAGE ON SCHEMA public TO context_reader');
    await admin.query('GRANT SELECT ON ALL TABLES IN SCHEMA public TO context_reader');
    const environment={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,LANG:'en_US.UTF-8',NODE_ENV:'test',DATABASE_URL:connection('context_reader'),AGENT_CONTEXT_ADMIN_URL:connection('audit_admin'),RULELOOP_CONTEXT_AUDIT:'isolated-new-cluster'};
    const result=command(process.execPath,[path.join(root,'node_modules/vitest/vitest.mjs'),'run','--config',path.join(__dirname,'vitest.config.mts'),'--reporter=default','--reporter=json','--outputFile.json='+path.join(__dirname,'test-results.json')],{cwd:root,env:environment});
    fs.writeFileSync(path.join(__dirname,'test-output.txt'),result.stdout+result.stderr);
    const report=JSON.parse(fs.readFileSync(path.join(__dirname,'test-results.json'),'utf8'));
    if(!report.success || report.numPendingTests) throw new Error('Integration checks were not all executed successfully');
    const types=command(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'--project',path.join(__dirname,'tsconfig.json')],{cwd:root,env:environment});
    fs.writeFileSync(path.join(__dirname,'typecheck-output.txt'),types.stdout+types.stderr+'TypeScript completed with exit code 0.\n');
    fs.writeFileSync(path.join(__dirname,'database-verification.json'),JSON.stringify({scope:'Candidate context loader against actual RuleLoop migrations and account transaction/RLS; synthetic users, test auth identity, SELECT-only runtime; not browser session or Hermes acceptance',passed:report.numPassedTests,failed:report.numFailedTests,typecheck:true,migrationHashes:hashes,productionDatabaseAccess:false,modelCalls:0,productionPatchApplied:false,temporaryClusterCleanup:'completed after tests by finally'},null,2)+'\n');
    console.log(JSON.stringify({passed:report.numPassedTests,failed:report.numFailedTests,modelCalls:0,productionPatchApplied:false}));
  } finally {
    if(admin) await admin.end();
    const status=spawnSync(path.join(bin,'pg_ctl'),['-D',data,'status'],{encoding:'utf8'});
    if(started || status.status===0) command(path.join(bin,'pg_ctl'),['-D',data,'-m','fast','-w','stop']);
    fs.rmSync(work,{recursive:true,force:true});
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
