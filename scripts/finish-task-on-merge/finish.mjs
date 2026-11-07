// Finish task on merge: when a person merges a pull request into a repository's default branch, moves the task its
// title names ("feat(<TaskID>): …") to done, comments the PR on it, and moves the parent to done once every subtask is.
//
// - Only a task whose list the config repository links to this exact repository (Owner/Name, confirmed by its
//   repository ID) is touched. Anything else changes nothing and logs why.
// - A task that's already done keeps its status. A merged GitHub revert ("Revert \"feat(<TaskID>): …\"") never reopens
//   the reverted task: it's recorded as a new subtask, already done.
// - Every write carries a Finish key, `<repository id>/pr-<number>/<merge SHA>`, and is looked for before it's made,
//   so a re-run adds nothing. After an error or a timeout the run looks again before retrying once, because the
//   tracker may already have accepted the write. This is at-least-once with reconciliation, not exactly-once: if the
//   tracker's reads lag behind its writes, a duplicate is still possible, and the run says so in its log.
//
//   node finish.mjs settings  checks the caller's settings before anything is read
//   node finish.mjs merged    reads its inputs from the environment (see the workflow)
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { CHANGE_TYPES, clickUpTeamId, findList, parseSpaces, parseTaskId, providerReason, repositoryOf, sameRepository } from '../lib/tasks.mjs';

const SIGNATURE = 'Posted by the Finish task on merge workflow';
const TITLE = new RegExp(`^(${CHANGE_TYPES.join('|')})\\(([^)]+)\\): *(.+)$`);

/** The task a merged PR's title names, or null. GitHub's revert title names a revert of it. */
export function mergedPullRequestTask(title) {
  const value = String(title ?? '').trim();
  const revert = /^Revert "(.+)"$/.exec(value);
  const match = TITLE.exec(revert ? revert[1] : value);
  if (!match) return null;
  let ref;
  try { ref = parseTaskId(match[2]).ref; } catch { return null; }
  return { ref, revert: Boolean(revert), summary: match[3].trim() };
}

/** Done means the done status by name, or any closed status, so a manual "Done" is respected. */
export function isDone(status, doneStatus = 'done') {
  return String(status?.status ?? '').toLowerCase() === doneStatus.toLowerCase() || status?.type === 'closed';
}

export function allSubtasksDone(task, doneStatus = 'done') {
  const subtasks = task?.subtasks ?? [];
  return subtasks.length > 0 && subtasks.every(subtask => isDone(subtask.status, doneStatus));
}

/** The Category option a task has, so a revert subtask can take the same one. */
export function categoryOption(task) {
  const field = (task?.custom_fields ?? []).find(f => f.name === 'Category');
  if (field?.value === undefined || field.value === null) return null;
  const option = (field.type_config?.options ?? []).find(o => o.orderindex === Number(field.value) || o.id === field.value);
  return option ? { fieldId: field.id, optionId: option.id } : null;
}

/** The key every write for this merge carries. A suffix tells the parent and revert writes apart. */
export function finishKey({ repositoryId, number, mergeSha }, suffix = '') {
  return `Finish key: ${repositoryId}/pr-${number}/${mergeSha}${suffix ? `/${suffix}` : ''}`;
}

const footer = (key, librarySha) => `${key}\nRecorded by agent-playbook at ${String(librarySha ?? 'unknown').slice(0, 12)}.\n\n${SIGNATURE}`;

export function mergedComment({ number, url, moved, doneStatus, key, librarySha }) {
  return `Pull request #${number} was merged: ${url}\n\n` +
    (moved ? `Moved to "${doneStatus}".` : `It was already "${doneStatus}", so its status wasn't changed.`) + `\n\n${footer(key, librarySha)}`;
}

export function parentDoneComment({ doneStatus, key, librarySha }) {
  return `All of this task's subtasks are "${doneStatus}", so it was moved to "${doneStatus}" too.\n\n${footer(key, librarySha)}`;
}

export function revertedComment({ number, url, subtaskRef, key, librarySha }) {
  return `Pull request #${number} reverted this task's change: ${url}\n\n` +
    `This task wasn't changed. The revert is recorded as the subtask ${subtaskRef}.\n\n${footer(key, librarySha)}`;
}

/**
 * Why a merge in `repository` mustn't change this task, or null when its list is linked to exactly that repository.
 * A bare name in the config means `defaultOwner`'s repository. Two lists linked to the same repository are refused,
 * because the config is then ambiguous.
 */
export function linkProblem(spaces, task, { repository, defaultOwner }) {
  const list = findList(spaces, task?.list?.id);
  if (!list) return `its list (${task?.list?.name ?? task?.list?.id ?? 'unknown'}) isn't in any space file in the config repository`;
  let linked;
  try { linked = repositoryOf(list.repository, defaultOwner); } catch (error) { return `the ${list.name} list's repository is invalid: ${error.message}`; }
  if (!linked) return `the ${list.name} list isn't linked to a repository`;
  if (!sameRepository(linked, repository)) return `the ${list.name} list is linked to ${linked}, not ${repository}`;
  const others = spaces.flatMap(space => (space.lists ?? []).map(item => ({ ...item, file: space.file })))
    .filter(item => String(item.id) !== list.id)
    .filter(item => { try { return sameRepository(repositoryOf(item.repository, defaultOwner), repository); } catch { return false; } });
  if (others.length) return `${repository} is linked to more than one list (${[list.name, ...others.map(o => o.name)].join(', ')}), so the config is ambiguous. Link each repository to one list`;
  return null;
}

/** Looks for a write, makes it if it's missing, and after a failure looks again before retrying once. */
export async function ensure(find, write, log = console.log) {
  if (await find()) return 'existing';
  try {
    await write();
    return 'written';
  } catch (error) {
    log(`A write failed (${error.message}). Checking whether it landed before retrying.`);
    if (await find()) return 'existing';
    await write();
    return 'retried';
  }
}

function clickUp(env, teamId) {
  const send = async (method, path, body) => {
    const response = await fetch(`https://api.clickup.com/api/v2${path}`, {
      method, headers: { Authorization: env.CLICKUP_TOKEN, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`${await providerReason('ClickUp', response, `${method} ${path.split('?')[0]}`)}. Check the CLICKUP_TOKEN secret and its access to this workspace.`);
    return response.json();
  };
  const query = (custom, extra = {}) => new URLSearchParams({ ...(custom ? { custom_task_ids: 'true', team_id: teamId } : {}), ...extra });
  return {
    getTask: ({ apiId, custom }, extra) => send('GET', `/task/${encodeURIComponent(apiId)}?${query(custom, extra)}`),
    comments: async id => (await send('GET', `/task/${id}/comment`))?.comments ?? [],
    setStatus: (id, status) => send('PUT', `/task/${id}`, { status }),
    comment: (id, text) => send('POST', `/task/${id}/comment`, { comment_text: text, notify_all: false }),
    createTask: (listId, body) => send('POST', `/list/${listId}/task`, body),
  };
}

async function repositoryId(env, repository) {
  const response = await fetch(`https://api.github.com/repos/${repository}`, {
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${await providerReason('GitHub', response, `looking up ${repository}`)}.`);
  return String((await response.json()).id);
}

const hasKey = (comments, key) => comments.some(c => String(c.comment_text ?? '').includes(key));

async function finishParent(api, parentId, context) {
  if (!parentId) return;
  const parent = await api.getTask({ apiId: parentId, custom: false }, { include_subtasks: 'true' });
  if (!parent || !allSubtasksDone(parent, context.doneStatus)) return;
  if (!isDone(parent.status, context.doneStatus)) await api.setStatus(parent.id, context.doneStatus);
  const key = finishKey(context.pr, 'parent');
  const result = await ensure(async () => hasKey(await api.comments(parent.id), key),
    () => api.comment(parent.id, parentDoneComment({ ...context, key })));
  console.log(`All subtasks of ${parent.custom_id ?? parent.id} are done; it's "${context.doneStatus}" (comment ${result}).`);
}

async function findRevertSubtask(api, parentId, key) {
  const parent = await api.getTask({ apiId: parentId, custom: false }, { include_subtasks: 'true' });
  for (const subtask of parent?.subtasks ?? []) {
    if (!String(subtask.name ?? '').startsWith('Revert:')) continue;
    const full = await api.getTask({ apiId: subtask.id, custom: false }, { include_markdown_description: 'true' });
    if (String(full?.markdown_description ?? full?.description ?? '').includes(key)) return full;
  }
  return null;
}

// Organisation-level variables and secrets don't reach private repositories on every GitHub plan, which is the
// usual reason a setting the caller "already has" arrives empty.
const SCOPE_HINT = "If it's set for the organisation, check that it reaches this repository: on some GitHub plans organisation " +
  'variables and secrets reach only public repositories, so set it on the repository instead.';
const OWNER_NAME = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}\/[A-Za-z0-9._-]{1,100}$/;

/** Why the caller's settings can't work, saying what to set, or null when they look right. */
export function settingsProblem(env) {
  const config = String(env.CONFIG_REPOSITORY ?? '').trim();
  if (!config) return `config-repository is empty. Pass the config repository as Owner/Name. ${SCOPE_HINT}`;
  if (!OWNER_NAME.test(config)) return `config-repository '${config}' isn't Owner/Name, e.g. org-a/config, without a URL.`;
  if (!env.CLICKUP_TOKEN) return `CLICKUP_TOKEN is empty. Pass it by name in the calling job's secrets. ${SCOPE_HINT}`;
  return null;
}

export async function merged(env) {
  const doneStatus = env.DONE_STATUS || 'done';
  const repository = env.REPOSITORY;
  const record = { library: env.LIBRARY_SHA ?? null, execution_repository: { repository, repository_id: env.REPOSITORY_ID ?? null },
    target_repository: { repository, repository_id: env.REPOSITORY_ID ?? null },
    config: { repository: env.CONFIG_REPOSITORY ?? null, sha: env.CONFIG_SHA ?? null }, task: null, outcome: null };
  const done = outcome => { record.outcome = outcome; console.log(outcome); summary(env, record); return record; };

  const named = mergedPullRequestTask(env.PR_TITLE);
  if (!named) return done(`"${env.PR_TITLE}" names no task, so nothing was changed.`);
  record.task = named.ref;
  const spaces = parseSpaces(env.SPACES ?? readFileSync(env.SPACES_FILE, 'utf8'));
  const id = parseTaskId(named.ref);
  const api = clickUp(env, id.custom ? await clickUpTeamId(env, async url => {
    const response = await fetch(url, { headers: { Authorization: env.CLICKUP_TOKEN } });
    if (!response.ok) throw new Error(`${await providerReason('ClickUp', response, 'listing workspaces')}.`);
    return response.json();
  }) : undefined);
  const task = await api.getTask(id);
  if (!task) return done(`${named.ref} wasn't found in ClickUp, so nothing was changed.`);
  const defaultOwner = String(env.CONFIG_REPOSITORY ?? '').split('/')[0];
  const problem = linkProblem(spaces, task, { repository, defaultOwner });
  if (problem) return done(`${named.ref} was left as it is: ${problem}.`);
  const foundId = await repositoryId(env, repository);
  if (foundId !== String(env.REPOSITORY_ID)) {
    return done(`${named.ref} was left as it is: ${repository} has repository ID ${foundId}, but this run came from ${env.REPOSITORY_ID}. The repository may have been renamed or recreated.`);
  }

  const pr = { repositoryId: env.REPOSITORY_ID, number: env.PR_NUMBER, mergeSha: env.MERGE_SHA };
  const context = { number: env.PR_NUMBER, url: env.PR_URL, doneStatus, librarySha: env.LIBRARY_SHA, pr };

  if (named.revert) {
    const parentId = task.parent ?? task.id;
    const key = finishKey(pr, 'revert');
    let subtask = null;
    const category = categoryOption(task);
    const created = await ensure(async () => (subtask = await findRevertSubtask(api, parentId, key)) !== null, async () => {
      subtask = await api.createTask(task.list.id, {
        name: `Revert: ${named.summary}`.slice(0, 200),
        markdown_content: `Records pull request #${context.number}, which reverted ${named.ref}'s change: ${context.url}\n\n${footer(key, context.librarySha)}`,
        parent: parentId, status: doneStatus, tags: ['coding'],
        ...(category ? { custom_fields: [{ id: category.fieldId, value: category.optionId }] } : {}),
      });
    });
    const subtaskRef = subtask?.custom_id ?? `CU-${subtask?.id}`;
    await ensure(async () => hasKey(await api.comments(task.id), key),
      () => api.comment(task.id, revertedComment({ ...context, subtaskRef, key })));
    return done(`Recorded the revert of ${named.ref} as the done subtask ${subtaskRef} (${created}); ${named.ref} wasn't changed.`);
  }

  const moved = !isDone(task.status, doneStatus);
  if (moved) await api.setStatus(task.id, doneStatus);
  const key = finishKey(pr);
  const commented = await ensure(async () => hasKey(await api.comments(task.id), key),
    () => api.comment(task.id, mergedComment({ ...context, moved, key })));
  await finishParent(api, task.parent, context);
  return done(moved ? `Moved ${named.ref} to "${doneStatus}" (comment ${commented}).` : `${named.ref} was already done; its status wasn't changed (comment ${commented}).`);
}

function summary(env, record) {
  if (!env.GITHUB_STEP_SUMMARY) return;
  appendFileSync(env.GITHUB_STEP_SUMMARY, `### Finish task on merge\n\n${record.outcome}\n\n\`\`\`json\n${JSON.stringify(record, null, 2)}\n\`\`\`\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const mode = process.argv[2];
  if (mode !== 'merged' && mode !== 'settings') {
    console.error('Usage: node finish.mjs settings|merged');
    process.exit(2);
  }
  if (mode === 'settings') {
    const problem = settingsProblem(process.env);
    if (problem) { console.error(`::error::${problem}`); process.exit(1); }
    console.log('The caller passed config-repository and CLICKUP_TOKEN.');
    process.exit(0);
  }
  try {
    await merged(process.env);
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exit(1);
  }
}
