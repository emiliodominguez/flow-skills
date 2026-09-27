import { extractSkillRefs, HANDOFF_VERB, skillStage, STAGES, type Skill, type Stage } from "./skill.js";

/** A directed handoff: `from` names `to` in its description's handoff clause. */
export interface Edge {
	from: string;
	to: string;
}

/**
 * The skills a given skill hands off to, read from the handoff clause of its description
 * (the text from the first `hands off/back to` / `routes to` / `feeds` onward), so the
 * result holds successors rather than the neighbors a boundary sentence also mentions.
 *
 * @param skill - The skill whose handoffs to extract.
 * @param names - Every known skill name.
 * @returns The target skill ids, deduped, excluding self and unknown names.
 */
export function handoffTargets(skill: Skill, names: Set<string>): string[] {
	const description = skill.frontmatter.description;
	const verb = HANDOFF_VERB.exec(description);

	if (!verb) return [];

	const targets = new Set<string>();

	for (const ref of extractSkillRefs(description.slice(verb.index))) {
		if (ref !== skill.name && names.has(ref)) targets.add(ref);
	}

	return [...targets];
}

/**
 * Every handoff edge in the corpus, in skill order.
 *
 * @param skills - The loaded skills.
 * @returns The edges.
 */
export function handoffEdges(skills: Skill[]): Edge[] {
	const names = new Set(skills.map((skill) => skill.name));

	return skills.flatMap((skill) => handoffTargets(skill, names).map((to) => ({ from: skill.name, to })));
}

/**
 * A Mermaid-safe node id; hyphens would otherwise read as part of an arrow.
 *
 * @param name - Skill name.
 * @returns The node id.
 */
function nodeId(name: string): string {
	return name.replaceAll("-", "_");
}

/**
 * A Mermaid node declaration labelled with the skill name.
 *
 * @param name - Skill name.
 * @returns The node line body.
 */
function node(name: string): string {
	return `${nodeId(name)}["${name}"]`;
}

/**
 * The whole suite as a Mermaid flowchart: one subgraph per workflow stage, in stage order,
 * with an edge for every handoff.
 *
 * @param skills - The loaded skills.
 * @returns Mermaid source, without the code fence.
 */
export function suiteGraph(skills: Skill[]): string {
	const lines = ["flowchart LR"];

	for (const stage of STAGES) {
		const members = skills.filter((skill) => skillStage(skill) === stage);

		if (members.length === 0) continue;

		lines.push(`  subgraph stage_${stage}["${stage}"]`, ...members.map((skill) => `    ${node(skill.name)}`), "  end");
	}

	lines.push(...handoffEdges(skills).map((edge) => `  ${nodeId(edge.from)} --> ${nodeId(edge.to)}`));

	return lines.join("\n");
}

/**
 * The suite collapsed to workflow stages: one node per stage (with its skill count) and one
 * edge per stage pair that has handoffs, labelled with how many. Handoffs inside a stage are
 * left out; they belong to the detailed graph.
 *
 * @param skills - The loaded skills.
 * @returns Mermaid source, without the code fence.
 */
export function stageGraph(skills: Skill[]): string {
	const stageOf = new Map(skills.map((skill) => [skill.name, skillStage(skill)]));
	const counts = new Map<string, number>();

	for (const edge of handoffEdges(skills)) {
		const from = stageOf.get(edge.from);
		const to = stageOf.get(edge.to);

		if (from && to && from !== to) counts.set(`${from} ${to}`, (counts.get(`${from} ${to}`) ?? 0) + 1);
	}

	const lines = ["flowchart LR"];

	for (const stage of STAGES) {
		const size = skills.filter((skill) => skillStage(skill) === stage).length;

		if (size > 0) lines.push(`  stage_${stage}["${stage} (${size})"]`);
	}

	const rank = (stage: string) => STAGES.indexOf(stage as Stage);
	const pairs = [...counts].map(([pair, count]) => [...pair.split(" "), count] as [string, string, number]);

	pairs.sort((a, b) => rank(a[0]) - rank(b[0]) || rank(a[1]) - rank(b[1]));

	for (const [from, to, count] of pairs) lines.push(`  stage_${from} -->|${count}| stage_${to}`);

	return lines.join("\n");
}

/**
 * One skill's neighborhood as a Mermaid flowchart: the skills that hand off to it, the skill
 * itself (highlighted), and the skills it hands off to.
 *
 * @param skill - The focused skill.
 * @param edges - Every handoff edge in the corpus.
 * @returns Mermaid source, without the code fence.
 */
export function focusGraph(skill: Skill, edges: Edge[]): string {
	const incoming = edges.filter((edge) => edge.to === skill.name).map((edge) => edge.from);
	const outgoing = edges.filter((edge) => edge.from === skill.name).map((edge) => edge.to);
	const self = nodeId(skill.name);
	const lines = ["flowchart LR", `  ${node(skill.name)}`];

	for (const name of new Set([...incoming, ...outgoing])) lines.push(`  ${node(name)}`);

	lines.push(...incoming.map((name) => `  ${nodeId(name)} --> ${self}`), ...outgoing.map((name) => `  ${self} --> ${nodeId(name)}`));
	lines.push("  classDef focus stroke-width:3px", `  class ${self} focus`);

	return lines.join("\n");
}
