import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { captureFiles, captureGit, fixturePath, prepareScenario, type Scenario } from "../scripts/lib/fixtures";
import { auditedTool, callFixtureTool, type FixtureConfig, type ToolEvent } from "../scripts/lib/fixture-tools";
import {
	behaviorArgs,
	behaviorJudgePrompt,
	checkBehavior,
	fileHashes,
	parseBehaviorTranscript,
	runBoundedProcess,
	type BehaviorCase,
} from "../scripts/lib/behavior-eval";

const root = path.resolve(import.meta.dirname, "..");
const scenarios = JSON.parse(fs.readFileSync(path.join(root, "evals/scenarios.json"), "utf8")) as Scenario[];
const cases = JSON.parse(fs.readFileSync(path.join(root, "evals/behavior.json"), "utf8")) as BehaviorCase[];
const temporary: string[] = [];

/**
 * Create a disposable fixture with its trusted tool configuration.
 * @param id - Scenario id.
 * @returns Fixture and audit paths plus the initial hashes.
 */
function fixture(id = "contract-verification"): FixtureConfig {
	const parent = fs.mkdtempSync(path.join(os.tmpdir(), "flow-behavior-test-"));
	const directory = path.join(parent, "fixture");

	temporary.push(parent);
	prepareScenario(
		scenarios.find(function (scenario) {
			return scenario.id === id;
		})!,
		directory,
	);

	return {
		directory,
		audit: path.join(parent, "audit.jsonl"),
		initial: fileHashes(captureFiles(directory)),
		testFiles: cases.find(function (item) {
			return item.id === id;
		})!.testFiles,
	};
}

afterEach(function () {
	for (const directory of temporary.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe("behavioral fixtures", function () {
	it("prepares independent staged and working layers and refuses existing destinations", function () {
		const config = fixture("staged-review");
		const git = captureGit(config.directory)!;

		expect(git.staged).toContain("+\treturn true;");
		expect(git.unstaged).toContain("+\treturn actor.id === document.ownerId;");
		expect(function () {
			prepareScenario(scenarios[0]!, config.directory);
		}).toThrow();
		expect(captureGit(config.directory)).toEqual(git);
	});

	it("rejects traversal, absolute names, Git internals and symlinks", function () {
		const config = fixture();

		for (const file of [
			"../outside",
			"..\\outside",
			"/tmp/outside",
			"C:\\outside",
			".git/config",
			".git\\index",
			".GIT/config",
			".GiT/index",
			".git./config",
			".git /config",
			"file:stream",
			"",
			"./file",
		]) {
			expect(function () {
				fixturePath(config.directory, file);
			}, file).toThrow();
		}

		fs.symlinkSync(path.dirname(config.directory), path.join(config.directory, "link"));
		fs.symlinkSync(path.join(config.directory, "missing"), path.join(config.directory, "dangling"));
		expect(function () {
			fixturePath(config.directory, "link/audit.jsonl");
		}).toThrow(/Symlink/);
		expect(function () {
			fixturePath(config.directory, "dangling");
		}).toThrow(/Symlink/);
	});

	it.skipIf(process.platform === "win32")("refuses Git config aliases and suppresses executable file-system monitors", function () {
		const config = fixture("staged-review");
		const monitor = path.join(path.dirname(config.directory), "monitor.sh");
		const marker = `${monitor}.marker`;

		fs.writeFileSync(monitor, '#!/bin/sh\nprintf marker > "$0.marker"\n', { mode: 0o755 });
		expect(spawnSync(monitor).status).toBe(0);
		expect(fs.existsSync(marker)).toBe(true);
		fs.unlinkSync(marker);

		expect(auditedTool(config, "write_file", { path: ".GIT/config", content: "[core]\nfsmonitor = invalid-monitor-command\n" }).isError).toBe(
			true,
		);
		fs.appendFileSync(path.join(config.directory, ".git/config"), `\n[core]\nfsmonitor = ${JSON.stringify(monitor)}\n`);
		captureGit(config.directory);
		expect(fs.existsSync(marker)).toBe(false);
	});

	it("runs the real trusted tests but refuses edited code or additional files", function () {
		const config = fixture();
		const result = callFixtureTool(config, "run_tests", {}) as { command: string[]; exitCode: number; stdout: string };

		expect(result.command.slice(1)).toEqual(["--test", "total.test.mjs"]);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("pass 2");
		callFixtureTool(config, "write_file", { path: "total.mjs", content: "throw new Error('changed');" });
		expect(function () {
			callFixtureTool(config, "run_tests", {});
		}).toThrow(/modified fixture/);
	});

	it("audits successful calls and denied paths outside the fixture", function () {
		const config = fixture();

		expect(auditedTool(config, "read_file", { path: "contract.md" }).isError).toBe(false);
		expect(auditedTool(config, "write_file", { path: "../outside", content: "wrong" }).isError).toBe(true);
		const audit = fs
			.readFileSync(config.audit, "utf8")
			.trim()
			.split("\n")
			.map(function (line) {
				return JSON.parse(line) as ToolEvent;
			});

		expect(
			audit.map(function (event) {
				return event.ok;
			}),
		).toEqual([true, false]);
		expect(fs.existsSync(path.join(path.dirname(config.directory), "outside"))).toBe(false);
	});

	it("serves actual MCP requests over stdio", async function () {
		const config = fixture();
		const configFile = path.join(path.dirname(config.directory), "config.json");

		fs.writeFileSync(configFile, JSON.stringify(config));
		const requests = [
			{ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05" } },
			{ jsonrpc: "2.0", method: "notifications/initialized" },
			{ jsonrpc: "2.0", id: 2, method: "tools/list" },
			{ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "read_file", arguments: { path: "total.mjs" } } },
		];
		const result = await runBoundedProcess(
			process.execPath,
			["--import", import.meta.resolve("tsx"), path.join(root, "scripts/fixture-server.ts"), configFile],
			config.directory,
			requests
				.map(function (request) {
					return JSON.stringify(request);
				})
				.join("\n") + "\n",
			5000,
		);

		expect(result.exitCode).toBe(0);
		const replies = result.stdout
			.trim()
			.split("\n")
			.map(function (line) {
				return JSON.parse(line) as { id: number; result: { content?: { text: string }[] } };
			});

		expect(
			replies.map(function (reply) {
				return reply.id;
			}),
		).toEqual([1, 2, 3]);
		expect(replies[2]!.result.content![0]!.text).toContain("priceCents");
	});
});

describe("behavioral evidence", function () {
	it("requires assessor cases for all prepared scenarios with no duplicate assertions", function () {
		expect(
			cases
				.map(function (item) {
					return item.id;
				})
				.sort(),
		).toEqual(
			scenarios
				.map(function (item) {
					return item.id;
				})
				.sort(),
		);

		for (const item of cases) {
			expect(item.assertions.length).toBeGreaterThan(0);
			expect(new Set(item.assertions).size).toBe(item.assertions.length);
		}
	});

	it("fails missing tool evidence and a write even when the source was restored", function () {
		const item = cases[0]!;
		const files = { "access.mjs": "original" };
		const checks = checkBehavior(item, files, files, [
			{ name: "write_file", args: { path: "access.mjs", content: "original" }, ok: true, result: {} },
		]);

		expect(
			checks.find(function (check) {
				return check.beat === "avoids protected writes";
			})!.present,
		).toBe(false);
		expect(
			checks.find(function (check) {
				return check.beat === "executed git_diff";
			})!.present,
		).toBe(false);
	});

	it("permits new run notes but rejects changes to historical verdicts and implementation files", function () {
		const item = cases[2]!;
		const before = { "extract.csv": "bad", "plan.run/T1-attempt-3-verifier.md": "REJECT" };

		expect(checkBehavior(item, before, { ...before, "plan.run/resume.md": "blocked" }, [])[0]!.present).toBe(true);
		expect(checkBehavior(item, before, { ...before, "plan.run/T1-attempt-3-verifier.md": "ACCEPT" }, [])[0]!.present).toBe(false);
		expect(checkBehavior(item, before, { ...before, "extract.csv": "fixed" }, [])[0]!.present).toBe(false);
	});

	it("keeps assessor assertions out of the executing agent arguments", function () {
		const args = behaviorArgs("skill context", "server config");

		expect(args).toContain("--strict-mcp-config");
		expect(args[args.indexOf("--tools") + 1]).toBe("");
		expect(args).not.toContain("--dangerously-skip-permissions");
		expect(args.join(" ")).not.toContain(cases[0]!.assertions[0]);
		expect(behaviorJudgePrompt(cases[0]!, { answer: "evidence" })).toContain(cases[0]!.assertions[0]);
	});

	it("rejects partial output, error results, permission failures and unexpected tools", function () {
		const init = { type: "system", subtype: "init", tools: ["mcp__fixture__read_file"] };
		const result = {
			type: "result",
			subtype: "success",
			is_error: false,
			result: "done",
			usage: { output_tokens: 4 },
			modelUsage: { configured: {} },
		};

		/**
		 * Encode independent streamed events.
		 * @param events - Transcript entries.
		 * @returns JSON lines.
		 */
		function transcript(...events: unknown[]): string {
			return events
				.map(function (event) {
					return JSON.stringify(event);
				})
				.join("\n");
		}

		expect(parseBehaviorTranscript(transcript(init, result))).toEqual({ answer: "done", outputTokens: 4, models: ["configured"] });
		expect(function () {
			parseBehaviorTranscript(transcript(init));
		}).toThrow();
		expect(function () {
			parseBehaviorTranscript(transcript(init, { ...result, is_error: true }));
		}).toThrow();
		expect(function () {
			parseBehaviorTranscript(transcript(init, { ...result, permission_denials: [{}] }));
		}).toThrow();
		expect(function () {
			parseBehaviorTranscript(transcript({ ...init, tools: ["Bash"] }, result));
		}).toThrow();
	});

	it("retains nonzero exits and terminates timed-out processes", async function () {
		const failed = await runBoundedProcess(process.execPath, ["-e", "process.exit(3)"], os.tmpdir(), "", 1000);

		expect(failed.exitCode).toBe(3);
		const timedOut = await runBoundedProcess(process.execPath, ["-e", "setInterval(function () {}, 1000)"], os.tmpdir(), "", 50);

		expect(timedOut.timedOut).toBe(true);
		expect(timedOut.exitCode).not.toBe(0);
	});

	it.skipIf(process.platform === "win32")("kills a descendant that ignores SIGTERM after its parent exits", async function () {
		const childCode = 'process.on("SIGTERM", function () {}); setInterval(function () {}, 1000);';
		const parentCode = `const {spawn}=require("node:child_process"); const child=spawn(process.execPath,["-e",${JSON.stringify(childCode)}],{stdio:"ignore"}); console.log(child.pid); setInterval(function () {},1000);`;
		const result = await runBoundedProcess(process.execPath, ["-e", parentCode], os.tmpdir(), "", 300);
		const pid = Number(result.stdout.trim());

		expect(result.timedOut).toBe(true);
		// Give the kernel time to reap the killed descendant; do not rely on one process-table instant.
		await expect
			.poll(
				function () {
					try {
						process.kill(pid, 0);

						return false;
					} catch {
						return true;
					}
				},
				{ timeout: 2000 },
			)
			.toBe(true);
	});

	it.skipIf(process.platform === "win32")("forwards cancellation from an interrupted wrapper to its detached execution", async function () {
		const config = fixture();
		const marker = path.join(path.dirname(config.directory), "pid.txt");
		const childCode = `require("node:fs").writeFileSync(${JSON.stringify(marker)}, String(process.pid)); setInterval(function () {}, 1000);`;
		const moduleUrl = new URL("../scripts/lib/behavior-eval.ts", import.meta.url).href;
		const wrapperCode = `import {runBoundedProcess} from ${JSON.stringify(moduleUrl)}; setTimeout(function () {process.kill(process.pid,"SIGINT");},500); const result=await runBoundedProcess(process.execPath,["-e",${JSON.stringify(childCode)}],${JSON.stringify(os.tmpdir())},"",10000); console.log(JSON.stringify(result));`;
		const result = await runBoundedProcess(
			process.execPath,
			["--import", import.meta.resolve("tsx"), "--input-type=module", "-e", wrapperCode],
			os.tmpdir(),
			"",
			5000,
		);
		const nested = JSON.parse(result.stdout) as { interrupted: boolean };

		expect(nested.interrupted).toBe(true);
		const pid = Number(fs.readFileSync(marker, "utf8"));

		expect(function () {
			process.kill(pid, 0);
		}).toThrow();
	});

	it("reports missing configuration as not run and rejects unknown scenarios and fractional runs", function () {
		const env = { ...process.env, EVAL_BACKEND: "" };
		const base = ["--import", "tsx", "scripts/eval-behavior.ts"];
		const missing = spawnSync(process.execPath, base, { cwd: root, env, encoding: "utf8" });

		expect(missing.status).toBe(2);
		expect(missing.stderr).toContain("not run");
		expect(spawnSync(process.execPath, [...base, "unknown"], { cwd: root, env }).status).toBe(1);
		expect(spawnSync(process.execPath, [...base, "--runs", "1.5"], { cwd: root, env }).status).toBe(1);
	});
});
