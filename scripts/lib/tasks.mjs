// Task IDs, the config repository's list links, and the task tracker's workspace. Shared by the playbook's workflows.

/** The change types a PR title or commit may start with: `type(TaskID): Summary`. */
export const CHANGE_TYPES = ['feat', 'fix', 'refactor'];

/** Accepts a custom ID such as <PREFIX>-31 (any case) or a ClickUp ID such as CU-<id> or the bare ClickUp ID. Throws on anything else. */
export function parseTaskId(raw) {
  const value = String(raw ?? '').trim();
  const custom = /^([A-Za-z][A-Za-z0-9]{0,9})-(\d{1,9})$/.exec(value);
  if (custom && custom[1].toUpperCase() !== 'CU') {
    const ref = `${custom[1].toUpperCase()}-${custom[2]}`;
    return { ref, apiId: ref, custom: true };
  }
  const clickUp = /^(?:CU-?)?([0-9a-z]{6,12})$/i.exec(value);
  if (clickUp) {
    const id = clickUp[1].toLowerCase();
    return { ref: `CU-${id}`, apiId: id, custom: false };
  }
  throw new Error(`"${value}" is not a task ID. Use a custom ID such as <PREFIX>-31 or a ClickUp ID such as CU-<id>.`);
}

/**
 * The config repository's space files, as the workflow's yq step writes them: one JSON object per line,
 * { "file": "spaces/web.yml", "space": "Web", "lists": [{ "name", "id", "repository" }] }.
 */
export function parseSpaces(text) {
  return String(text ?? '').split('\n').map(line => line.trim()).filter(Boolean).map(line => JSON.parse(line));
}

/** The list with this ID, with its space and file, or null when no space file has it. */
export function findList(spaces, listId) {
  for (const space of spaces) {
    const list = (space.lists ?? []).find(item => String(item?.id ?? '') === String(listId ?? ''));
    if (list) return { space: space.space ?? '', file: space.file ?? '', name: String(list.name ?? ''), id: String(list.id), repository: list.repository ?? null };
  }
  return null;
}

const NAME = /^[A-Za-z0-9._-]{1,100}$/;

/**
 * A list's `repository` as Owner/Name. A bare name means the default owner (the config repository's own
 * organisation). Returns null for no repository, and throws on anything that isn't a repository.
 */
export function repositoryOf(value, defaultOwner) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const parts = String(value).trim().split('/');
  if (parts.length === 1 && NAME.test(parts[0]) && NAME.test(String(defaultOwner ?? ''))) return `${defaultOwner}/${parts[0]}`;
  if (parts.length === 2 && parts.every(part => NAME.test(part))) return parts.join('/');
  throw new Error(`"${value}" isn't a repository name or Owner/Name`);
}

export const sameRepository = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();

/** The ClickUp workspace: CLICKUP_TEAM_ID, or the token's only workspace. */
export async function clickUpTeamId(env, fetchJson) {
  if (env.CLICKUP_TEAM_ID) return String(env.CLICKUP_TEAM_ID);
  const teams = (await fetchJson('https://api.clickup.com/api/v2/team'))?.teams ?? [];
  if (teams.length === 1) return String(teams[0].id);
  throw new Error(`The ClickUp token can see ${teams.length} workspaces. Set the CLICKUP_TEAM_ID variable to the one to use.`);
}

/** Masks anything shaped like a key or token in a provider's message, so it can be logged. */
export function maskSecrets(text) {
  return String(text ?? '')
    .replace(/\bpk_[A-Za-z0-9_]+/g, 'pk_***')
    .replace(/\b(gh[pousr]_|github_pat_)[A-Za-z0-9_]+/g, '$1***')
    .replace(/\bBearer\s+[A-Za-z0-9._-]+/gi, 'Bearer ***');
}

/**
 * Why a provider refused a request, from its own error fields only. The rest of its response is never passed on,
 * because it can echo the request.
 */
export async function providerReason(provider, response, what) {
  let detail = '';
  try {
    const body = await response.json();
    const message = body?.err ?? body?.message ?? body?.error;
    const code = body?.ECODE ?? body?.code;
    if (message) detail = `: ${maskSecrets(message)}${code ? ` (${maskSecrets(code)})` : ''}`;
  } catch { /* no JSON body */ }
  return `${provider} answered HTTP ${response.status} to ${what}${detail}`;
}
