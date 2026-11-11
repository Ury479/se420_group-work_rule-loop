// Execute the current pure matcher; no account actions, database, model or env loading.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname,'../../..');
const req = createRequire(path.join(root,'package.json'));
const ts = req('typescript');
const assert = require('node:assert/strict');
const inputFile = path.join(root,'src/lib/domain/experience-trigger.ts');
const compiled = ts.transpileModule(fs.readFileSync(inputFile,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod = {exports:{}};
new Function('exports','module',compiled)(mod.exports,mod);
const matcher = mod.exports.selectMatchingRules;
const rule = { id:1,ruleText:'临近截止前核对提交状态',triggerText:'截止前24小时',recommendedAction:'核对提交凭据',status:'active',severity:'high',domain:'study',scenario:'homework',triggerCondition:'截止前24小时仍未提交',likelyMistakeKeywords:'作业,提交',currentVersion:1,validatedCount:0,helpfulCount:0,rulePriority:0 };
const cases = [
  {name:'same_domain_without_condition',input:{sceneType:'study',summary:'提前两周准备新课程阅读'},expected:[1],meaning:'Current matcher recalls same-domain rule without establishing its trigger condition.'},
  {name:'paused_rule_excluded',input:{sceneType:'study',summary:'作业即将截止'},rules:[{...rule,status:'paused'}],expected:[],meaning:'Paused rules remain excluded; AI retrieval must retain this constraint.'},
  {name:'no_same_domain_or_keyword',input:{sceneType:'relationship',summary:'安排朋友见面'},expected:[],meaning:'No retrieval candidate is valid; do not fabricate a matching personal lesson.'},
];
const results=cases.map(test=>{const ids=matcher(test.rules||[rule],test.input).map(item=>item.id);assert.deepEqual(ids,test.expected);return{name:test.name,input:test.input,matchedIds:ids,meaning:test.meaning};});
fs.writeFileSync(path.join(__dirname,'rule-recall-probe.json'),JSON.stringify({scope:'Current pure matcher on synthetic fixtures; not semantic applicability validation',results,conclusion:'Use existing match results as retrieval candidates. Source validity and trigger/applicability conditions require separate checks before advice.'},null,2)+'\n');
console.log(JSON.stringify({ruleRecallChecks:results.length,applicabilityIsNotProvenByRecall:true}));
