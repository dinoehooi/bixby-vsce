
import * as fs from 'fs'
import * as walkSync from 'walk-sync'
import * as path from 'path'

export class TrainingDataParser {
	constructor(
		private workspaceRoot: string
		) {
	}

	getTargetList(): string[] {
			// read targets from 'capsule.bxb' file
			const lines = (fs.readFileSync(path.join(this.workspaceRoot, 'capsule.bxb'), 'utf-8') ||
				fs.readFileSync(path.join(this.workspaceRoot, 'capsule.6t'), 'utf-8')).split('\n')
			const regex = /target\s*\(\s*bixby-([^\)]+)\)/
			return lines.map(line => {
				const matched = regex.exec(line)
				return matched ? matched[1].trim() : null
			}).filter(target=>target)
	}

	getGoalList(target: string): string[] {
		const arr = target.split('-')
		const device = arr[0]
		const lang = arr[1]
		const country = arr[2]
		const paths = [
			'resources/base',
			`resources/${lang}`,
			`resources/${lang}-${country}`,
			`resources/bixby-${device}-${lang}`,
			`resources/bixby-${device}-${lang}-${country}`,
		]
		paths.forEach(dir => this.parseSubDir(dir))
		this.generateTargetToGoalMap(target, paths)
		return Array.from(this.targetToGoalMap.get(target).keys()).sort((a,b)=>a.localeCompare(b))
	}

	getTrainingList(target: string, goal: string): Training[] {
		return this.targetToGoalMap.get(target).get(goal)
	}

	private parseSubDir(dir: string): void {
		if (this.dirToGoalMap[dir] == undefined) {
			this.dirToGoalMap.set(dir, new GoalToTrainingsMap(path.join(this.workspaceRoot, dir)))
		}
	}
	private generateTargetToGoalMap(target: string, paths: string[]):void {
		// merge
		const merged = new GoalToTrainingsMap()
		paths.forEach(dir=>{
			const source: GoalToTrainingsMap = this.dirToGoalMap.get(dir)
			source.forEach((trainings, goal)=>{
				if (merged.get(goal) == undefined) merged.set(goal, [])
				merged.get(goal).push(...trainings)
			})
		})
		// sort
		merged.forEach(trainings => {
			trainings.sort((a, b) => {return a.utterance.localeCompare(b.utterance)})
		})
		this.targetToGoalMap.set(target, merged)
		
	}
	private dirToGoalMap: Map<string, GoalToTrainingsMap> = new Map()
	private targetToGoalMap: Map<string, GoalToTrainingsMap> = new Map()
}

class GoalToTrainingsMap extends Map<string, Training[]> {
	constructor(dir?: string) {
		super()
		if (this.pathExists(dir)) {
			walkSync(dir, {
				globs: ['training/*.training.bxb', 'training/*.training.6t'],
				 directories: false,
				 includeBasePath: true
			}).forEach(filepath => {
				this.parseFile(filepath)
			})	
		}
	}

	private parseFile(filepath: string): void {
		const lines = fs.readFileSync(filepath, 'utf-8').split('\n')
		lines.forEach((line: string, index: number) => {
			let matched = /utterance\s*\("?(\[g:[^"]+)"?\)$/.exec(line)
			if (matched) {
				const alignedNL = matched[1].trim()
				matched = /\[g:[^\]]+\]/.exec(alignedNL)
				const goal = matched[0]
				const utterance = alignedNL.replace(/\[[^\]]+]|\(|\)/g, '').trim()
				if (this.get(goal) == undefined) this.set(goal, [])
				this.get(goal).push(new Training(utterance, alignedNL, filepath, index + 1))
			}
		})
	}

	private pathExists(p: string): boolean {
		try {
			fs.accessSync(p);
		} catch (err) {
			return false;
		}

		return true;
	}
}

export class Training {
	constructor(
		public readonly utterance: string,
		public readonly alignedNL: string,
		public readonly filepath: string,
		public readonly line: number
	) {}
}