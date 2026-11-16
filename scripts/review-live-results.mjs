import fs from 'node:fs';
import assert from 'node:assert/strict';
import {reviews} from '../evals/review-notes.mjs';
const label=process.argv[2];
assert.ok(reviews[label],'Define and review this entire run before recording grades');
const report=JSON.parse(fs.readFileSync(`evals/results/${label}-live.json`,'utf8'));
const results=report.results.map(row=>{
 const review=reviews[label][row.dialogue]?.[row.turn-1];
 assert.ok(review,'Missing manual review: '+row.dialogue+':'+row.turn);
 assert.ok(['pass','partial','fail','transport'].includes(review[0]));
 return {dialogue:row.dialogue,turn:row.turn,sha256:row.sha256,grade:review[0],reason:review[1]};
});
const grades={pass:0,partial:0,fail:0,transport:0};for(const row of results)grades[row.grade]++;
fs.mkdirSync('evals/reviews',{recursive:true});
fs.writeFileSync(`evals/reviews/${label}.json`,JSON.stringify({label,method:'Review of complete outputs against each declared rubric; no LLM judge; grades bound to saved output hashes',requests:results.length,grades,results},null,2)+'\n');
console.log(JSON.stringify({label,requests:results.length,grades}));
