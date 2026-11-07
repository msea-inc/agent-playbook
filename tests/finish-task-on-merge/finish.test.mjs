// Synthetic: every organisation, repository, list, task and ID here is made up for the test.
// Runs merged() against a fake ClickUp and a fake GitHub, the way a real merge event would.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergedPullRequestTask, isDone, allSubtasksDone, categoryOption, finishKey, linkProblem, ensure, merged, settingsProblem,
} from '../../scripts/finish-task-on-merge/finish.mjs';
import { parseTaskId, repositoryOf, maskSecrets } from '../../scripts/lib/tasks.mjs';

const status = (name, type = 'custom') => ({ status: name, type });

// Two organisations with identically named repositories, each with its own list.
const SPACES = [
  { file: 'spaces/a.yml', space: 'A', lists: [{ name: 'Board A', id: '100', repository: 'web' }] },
  { file: 'spaces/b.yml', space: 'B', lists: [{ name: 'Board B', id: '200', repository: 'org-b/web' }] },
].map(space => JSON.stringify(space)).join('\n');
const REPO_IDS = { 'org-a/web': '1111', 'org-b/web': '2222' };

let tasks, writes, comments, failNext;

function install() {
  writes = [];
  comments = {};
  failNext = null;
  const find = id => Object.values(tasks).find(t => t.id === id || t.custom_id === id);
  globalThis.fetch = async (url, { method = 'GET', body } = {}) => {
    const { host, pathname, searchParams } = new URL(url);
    const reply = (value, code = 200) => ({ ok: code < 300, status: code, json: async () => value });
    if (host === 'api.github.com') {
      const repo = pathname.replace('/repos/', '').toLowerCase();
      return REPO_IDS[repo] ? reply({ id: Number(REPO_IDS[repo]) }) : reply({ message: 'Not Found' }, 404);
    }
    const path = pathname.replace('/api/v2', '');
    const json = body ? JSON.parse(body) : undefined;
    let m;
    if (method === 'GET' && (m = /^\/task\/([^/]+)\/comment$/.exec(path))) return reply({ comments: (comments[m[1]] ?? []).map(text => ({ comment_text: text })) });
    if (method === 'GET' && (m = /^\/task\/([^/]+)$/.exec(path))) {
      const task = find(decodeURIComponent(m[1]));
      if (!task) return reply({ err: 'Task not found' }, 404);
      const subtasks = searchParams.get('include_subtasks') ? Object.values(tasks).filter(t => t.parent === task.id) : undefined;
      return reply({ ...task, ...(subtasks ? { subtasks } : {}) });
    }
    // A write the tracker accepts but whose answer is lost, like a timeout after the write landed.
    const lost = failNext && failNext(method, path);
    writes.push({ method, path, body: json });
    if (method === 'PUT' && (m = /^\/task\/([^/]+)$/.exec(path))) find(m[1]).status = status(json.status, 'closed');
    if (method === 'POST' && (m = /^\/task\/([^/]+)\/comment$/.exec(path))) (comments[m[1]] ??= []).push(json.comment_text);
    if (method === 'POST' && (m = /^\/list\/([^/]+)\/task$/.exec(path))) {
      const id = `new${writes.length}`;
      tasks[id] = { id, custom_id: `AAA-${900 + writes.length}`, name: json.name, parent: json.parent, markdown_description: json.markdown_content, status: status(json.status, 'closed'), list: { id: m[1] } };
    }
    if (lost) { failNext = null; throw new Error('The operation was aborted due to timeout'); }
    return reply({ ...(method === 'POST' && /^\/list\//.test(path) ? tasks[`new${writes.length}`] : {}) });
  };
}

const env = (title, { repository = 'org-a/web', merge = 'c'.repeat(40), number = '30' } = {}) => ({
  PR_TITLE: title, PR_NUMBER: number, PR_URL: `https://github.com/${repository}/pull/${number}`, MERGE_SHA: merge,
  REPOSITORY: repository, REPOSITORY_ID: REPO_IDS[repository] ?? '9999', GITHUB_TOKEN: 'gh-test', CLICKUP_TOKEN: 'cu-test',
  CLICKUP_TEAM_ID: '1', CONFIG_REPOSITORY: 'org-a/config', CONFIG_SHA: 'd'.repeat(40), LIBRARY_SHA: 'e'.repeat(40), SPACES, DONE_STATUS: 'done',
});
const task = (id, custom, extra = {}) => ({ id, custom_id: custom, name: custom, list: { id: '100' }, status: status('ready to review'), ...extra });
const statusWrites = () => writes.filter(w => w.method === 'PUT').map(w => [w.path, w.body.status]);
const commentWrites = () => writes.filter(w => w.method === 'POST' && w.path.endsWith('/comment'));

beforeEach(() => { tasks = {}; install(); });

test('the task comes from the PR title, including ClickUp IDs and revert titles', () => {
  assert.deepEqual(mergedPullRequestTask('feat(AAA-39): Finish tasks'), { ref: 'AAA-39', revert: false, summary: 'Finish tasks' });
  assert.deepEqual(mergedPullRequestTask('fix(CU-86abc12de): Fix it'), { ref: 'CU-86abc12de', revert: false, summary: 'Fix it' });
  assert.deepEqual(mergedPullRequestTask('Revert "refactor(aaa-7): Tidy"'), { ref: 'AAA-7', revert: true, summary: 'Tidy' });
  for (const title of ['Bump deps', 'feat(NoCU): x', 'chore(AAA-1): x', '', undefined]) assert.equal(mergedPullRequestTask(title), null);
});

test('done is the done status by name or any closed status', () => {
  assert.ok(isDone(status('Done', 'closed')));
  assert.ok(!isDone(status('ready to review', 'done')));
  assert.ok(allSubtasksDone({ subtasks: [{ status: status('done') }] }));
  assert.ok(!allSubtasksDone({ subtasks: [] }));
  assert.deepEqual(categoryOption({ custom_fields: [{ id: 'f', name: 'Category', value: 1, type_config: { options: [{ id: 'x', orderindex: 1 }] } }] }), { fieldId: 'f', optionId: 'x' });
});

test('a bare repository name means the config owner, and Owner/Name is used as written', () => {
  assert.equal(repositoryOf('web', 'org-a'), 'org-a/web');
  assert.equal(repositoryOf('org-b/web', 'org-a'), 'org-b/web');
  assert.equal(repositoryOf('', 'org-a'), null);
  assert.throws(() => repositoryOf('https://github.com/org-a/web', 'org-a'));
  assert.equal(parseTaskId('cu-86ABC12DE').ref, 'CU-86abc12de');
});

test('missing or malformed caller settings are refused before anything is read, saying what to set', () => {
  const ok = { CONFIG_REPOSITORY: 'org-a/config', CLICKUP_TOKEN: 'synthetic' };
  assert.equal(settingsProblem(ok), null);
  assert.match(settingsProblem({ ...ok, CONFIG_REPOSITORY: '' }), /config-repository is empty.*Owner\/Name.*reach only public repositories/s);
  assert.match(settingsProblem({ ...ok, CONFIG_REPOSITORY: ' ' }), /config-repository is empty/);
  for (const bad of ['config', 'org-a/config/extra', 'https://github.com/org-a/config', 'org a/config']) {
    assert.match(settingsProblem({ ...ok, CONFIG_REPOSITORY: bad }), /isn't Owner\/Name/, bad);
  }
  assert.match(settingsProblem({ ...ok, CLICKUP_TOKEN: '' }), /CLICKUP_TOKEN is empty.*by name.*reach only public repositories/s);
});

test('1: two organisations with identically named repositories stay isolated', async () => {
  tasks = { a: task('t1', 'AAA-1') };
  await merged(env('feat(AAA-1): A change', { repository: 'org-b/web' }));
  assert.deepEqual(writes, []);
  const spaces = SPACES.split('\n').map(l => JSON.parse(l));
  assert.match(linkProblem(spaces, { list: { id: '100' } }, { repository: 'org-b/web', defaultOwner: 'org-a' }), /linked to org-a\/web, not org-b\/web/);
  assert.equal(linkProblem(spaces, { list: { id: '200' } }, { repository: 'ORG-B/Web', defaultOwner: 'org-a' }), null);
});

test('2: a wrong mapping, an unknown list or a mismatched repository ID changes nothing and says why', async () => {
  tasks = { a: task('t1', 'AAA-1', { list: { id: '777' } }), b: task('t2', 'AAA-2') };
  const first = await merged(env('feat(AAA-1): Unknown list'));
  assert.match(first.outcome, /isn't in any space file/);
  const second = await merged({ ...env('feat(AAA-2): Renamed repository'), REPOSITORY_ID: '5555' });
  assert.match(second.outcome, /repository ID 1111, but this run came from 5555/);
  const spaces = [{ file: 'x', space: 'X', lists: [{ name: 'One', id: '100', repository: 'web' }, { name: 'Two', id: '101', repository: 'org-a/web' }] }];
  assert.match(linkProblem(spaces, { list: { id: '100' } }, { repository: 'org-a/web', defaultOwner: 'org-a' }), /more than one list \(One, Two\)/);
  assert.match(linkProblem(spaces, { list: { id: '100' } }, { repository: 'org-a/web', defaultOwner: '' }), /invalid/);
  const third = await merged(env('feat(AAA-404): Missing task'));
  assert.match(third.outcome, /wasn't found/);
  assert.deepEqual(writes, []);
});

test('a merged PR moves its subtask to done, comments once with its key, and finishes the parent', async () => {
  tasks = {
    p: task('p1', 'AAA-29', { status: status('in progress') }),
    a: task('s1', 'AAA-31', { parent: 'p1', status: status('done', 'closed') }),
    b: task('s2', 'AAA-32', { parent: 'p1' }),
  };
  const record = await merged(env('feat(AAA-32): Hand over'));
  assert.deepEqual(statusWrites(), [['/task/s2', 'done'], ['/task/p1', 'done']]);
  const comment = comments.s2[0];
  assert.match(comment, /#30 was merged/);
  assert.match(comment, new RegExp(finishKey({ repositoryId: '1111', number: '30', mergeSha: 'c'.repeat(40) })));
  assert.match(comment, /Recorded by agent-playbook at eeeeeeeeeeee/);
  assert.match(comments.p1[0], /All of this task's subtasks/);
  assert.equal(record.library, 'e'.repeat(40));
  assert.deepEqual(record.target_repository, { repository: 'org-a/web', repository_id: '1111' });
  assert.deepEqual(record.execution_repository, { repository: 'org-a/web', repository_id: '1111' });
  assert.equal(record.config.sha, 'd'.repeat(40));
});

test('3: the same merge event run again adds nothing', async () => {
  tasks = { p: task('p1', 'AAA-29'), b: task('s2', 'AAA-32', { parent: 'p1' }) };
  await merged(env('feat(AAA-32): Hand over'));
  const before = writes.length;
  await merged(env('feat(AAA-32): Hand over'));
  await merged(env('feat(AAA-32): Hand over'));
  assert.equal(writes.length, before);
  assert.equal(comments.s2.length, 1);
  assert.equal(comments.p1.length, 1);
});

test('3: a comment that landed before its answer was lost is found, not posted twice', async () => {
  tasks = { a: task('t1', 'AAA-1') };
  failNext = (method, path) => method === 'POST' && path.endsWith('/comment');
  const record = await merged(env('feat(AAA-1): A change'));
  assert.equal(comments.t1.length, 1);
  assert.match(record.outcome, /comment existing/);
});

test('3: a write that really failed is retried once after checking', async () => {
  let calls = 0;
  const result = await ensure(async () => false, async () => { calls += 1; if (calls === 1) throw new Error('HTTP 502'); }, () => {});
  assert.equal(result, 'retried');
  assert.equal(calls, 2);
  await assert.rejects(ensure(async () => false, async () => { throw new Error('HTTP 502'); }, () => {}), /HTTP 502/);
});

test('3: a second PR for a task that is already done adds one comment and changes no status', async () => {
  tasks = { a: task('t1', 'AAA-1', { status: status('done', 'closed') }) };
  await merged(env('feat(AAA-1): Follow-up', { number: '31', merge: 'f'.repeat(40) }));
  assert.deepEqual(statusWrites(), []);
  assert.equal(comments.t1.length, 1);
  assert.match(comments.t1[0], /already "done"/);
});

test('3: a merged revert records one done subtask, even when it is re-run or its comment is lost', async () => {
  const category = [{ id: 'f1', name: 'Category', value: 3, type_config: { options: [{ id: 'tools', orderindex: 3 }] } }];
  tasks = { a: task('t1', 'AAA-39', { status: status('done', 'closed'), custom_fields: category }) };
  failNext = (method, path) => method === 'POST' && path.endsWith('/comment');
  await merged(env('Revert "feat(AAA-39): Finish tasks"'));
  await merged(env('Revert "feat(AAA-39): Finish tasks"'));
  const created = writes.filter(w => w.path === '/list/100/task');
  assert.equal(created.length, 1);
  assert.equal(created[0].body.name, 'Revert: Finish tasks');
  assert.equal(created[0].body.parent, 't1');
  assert.deepEqual(created[0].body.custom_fields, [{ id: 'f1', value: 'tools' }]);
  assert.match(created[0].body.markdown_content, /Finish key: 1111\/pr-30\/c+\/revert/);
  assert.equal(comments.t1.length, 1);
  assert.match(comments.t1[0], /recorded as the subtask AAA-9\d\d/);
  assert.deepEqual(statusWrites(), []);
});

test("ClickUp's own error reason comes through, with keys masked", async () => {
  globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ err: 'Token invalid: pk_123_ABCDEF', ECODE: 'OAUTH_025' }) });
  await assert.rejects(merged(env('feat(AAA-1): A change')), error => {
    assert.match(error.message, /ClickUp answered HTTP 401 to GET \/task\/AAA-1: Token invalid: pk_\*\*\* \(OAUTH_025\)\. Check the CLICKUP_TOKEN secret/);
    assert.ok(!error.message.includes('ABCDEF'));
    return true;
  });
  assert.equal(maskSecrets('Bearer abc.def ghp_123456'), 'Bearer *** ghp_***');
});
