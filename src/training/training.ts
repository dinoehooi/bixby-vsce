import * as fs from 'fs'
import * as walkSync from 'walk-sync'
import * as path from 'path'
import * as jp from 'jsonpath'

export class TrainingManager {
	private trainingsPerDir: TrainingsPerDir = new TrainingsPerDir()
	private static instance: TrainingManager = undefined

	public static getInstance(workspaceRoot: string): TrainingManager {
		if (!TrainingManager.instance) {
			TrainingManager.instance = new TrainingManager(workspaceRoot)
		}
		return TrainingManager.instance
	}

	private constructor(
		private workspaceRoot: string
		) {
	}

	public clearCache(): void {
		this.trainingsPerDir = new TrainingsPerDir()
	}

	public getTargetList(): string[] {
		// read targets from 'capsule.bxb' file
		const lines = (fs.readFileSync(path.join(this.workspaceRoot, 'capsule.bxb'), 'utf-8')).split('\n')
		const regex = /target\s*\(\s*bixby-([^\)]+)\)/
		return lines.map(line => {
			line = line.replace(/\/\/.*$/, '')	// remove comment
			const matched = regex.exec(line)
			return matched ? matched[1].trim() : null
		}).filter(target=>target)
	}

	public getGoalList(target: string): string[] {
		const goals: Set<string> = new Set()
		this.getTrainingDirsForTarget(target).forEach(subdir => {
			if (!this.trainingsPerDir.get(subdir))
				this.trainingsPerDir.set(subdir, this.parseTrainingsFromDir(subdir))
			jp.query(this.trainingsPerDir.get(subdir), '$..goal').forEach(
				(goal: string) => goals.add(goal)
			)
		})
		return Array.from(goals).sort((a,b) => a && a.localeCompare(b))
	}

	public getTrainingList(target: string, goal?: string): Training[] {
		const trainings: Training[] = []
		this.getTrainingDirsForTarget(target).forEach(subdir => {
			if (goal) {
				trainings.push(...jp.query(this.trainingsPerDir.get(subdir), `$[?(@.goal=="${goal}")]`))
			} else {
				const t = this.trainingsPerDir.get(subdir)
				if (t) trainings.push(...t)
			}
		})
		return trainings.sort((a,b) => a.utterance && a.utterance.localeCompare(b.utterance))
	}

	public regroupTrainingFilesByGoal() {
		this.readAllTrainings()
		this.trainingsPerDir.forEach((trainings: Training[], subdir: string, map: TrainingsPerDir) => {
			if (trainings.length > 0) {
				const curDir = path.join(this.workspaceRoot, subdir)
				this.renameTrainingFiles(curDir)
				const goals: Set<string> = new Set()
				jp.query(trainings, '$..goal').forEach(
					(goal: string) => goals.add(goal)
				)
				goals.forEach(goal => {
					const lines = []
					jp.query(trainings, `$[?(@.goal=="${goal}")].raw`).forEach(raw => {
						lines.push(...raw)
					})
					const newName = goal.replace(/(\[g:|\])/g, '').replace(/:/g, '-')
					const newFilePath = path.join(curDir, `training/${newName}.training.bxb`)
					fs.writeFileSync(newFilePath, lines.join('\n'), 'utf-8')
				})
			}
		})
	}

	private renameTrainingFiles(subdir: string): void {
		walkSync(subdir, {
			globs: ['training/*.training.bxb', 'training/*.training.6t', 'training/*.old'],
			 directories: false,
			 includeBasePath: true
		}).forEach(filepath => {
			fs.renameSync(filepath, filepath + '.old')
		})
	}

	private getTrainingDirsForTarget(target: string): string[] {
		const arr = target.split('-')
		const device = arr[0]
		const lang = arr[1]
		const country = arr[2]
		return [
			'resources/base',
			`resources/${lang}`,
			`resources/${lang}-${country}`,
			`resources/bixby-${device}-${lang}`,
			`resources/bixby-${device}-${lang}-${country}`,
		]
	}

	public readAllTrainings(): void {
		walkSync(this.workspaceRoot, {
			globs: ['resources/*'],
			 directories: true,
			 includeBasePath: false
		}).forEach(subdir => {
			if (subdir.endsWith('/')) subdir = subdir.substr(0, subdir.length-1)
			if (!this.trainingsPerDir.get(subdir))
				this.trainingsPerDir.set(subdir, this.parseTrainingsFromDir(subdir)) 
		})
	}

	public gatherTaggedValueByType(searchType: string): string[] {
		const valueSet: Set<string> = new Set<string>()
		searchType = searchType.replace('.', '\\.')
		const re: RegExp = new RegExp(`\\(([^\\(]+)\\)\\[v:${searchType}\\]`, 'g')
		// const re = /\(([^\(]+)\)\[v:iotHelper.DeviceName\]/g
		Array.from(this.trainingsPerDir.values()).forEach(trainings => {
			trainings.forEach(training => {
				let matched: string[]
				while ((matched = re.exec(training.alignedNL)) !== null) {
					valueSet.add(matched[1])
				}
			})
		})
		return Array.from(valueSet).sort((a,b) => a && a.localeCompare(b))
	}

	private parseTrainingsFromDir(subdir: string): Training[] {
		const trainings: Training[] = []
		const basePath = path.join(this.workspaceRoot, subdir)
		if (pathExists(basePath)) {
			walkSync(basePath, {
				globs: ['training/*.training.bxb', 'training/*.training.6t'],
				directories: false,
				includeBasePath: true
			}).forEach(filepath => {
				trainings.push(...this.parseTrainingsFromFile(filepath, subdir))
			})	
		}
		return trainings
	}

	private parseTrainingsFromFile(filepath: string, target: string): Training[] {
		const trainings: Training[] = []
		const lines: string[] = fs.readFileSync(filepath, 'utf-8').split('\n')
		const startPattern = /train\s*\(\s*(t-[a-z0-9]+)\s*\)/
		const endPattern = /^\s*}\s*$/
		let openLine = 0
		let raw: string[]
		lines.forEach((line: string, index: number) => {
			const pure = line.replace(/\/\/.*$/, '')	// remove comment
			if (openLine > 0) {
				raw.push(line)
				if (endPattern.test(pure)) {
					trainings.push(this.parseTraining(raw, openLine, filepath, target))
					openLine = 0
				} else if (startPattern.test(pure)) {
					throw new Error(`it failed to parse trainings: ${filepath} (line: ${line})`)
				}
			} else {
				if (startPattern.test(pure)) {
					openLine = index + 1
					raw = []
					raw.push(line)
				}
			}
		})
		return trainings
	}

	private parseTraining(raw: string[], lineNum: number, filepath: string, target: string): Training {
		let alignedNL
		let goal
		let utterance
		for (const line of raw) {
			let matched = /utterance\s*\("?(\[g:[^"]+)"?\)$/.exec(line)
			if (matched) {
				alignedNL = matched[1].trim()
				matched = /\[g:[^\]]+\]/.exec(alignedNL)
				goal = matched[0]
				utterance = alignedNL.replace(/\[[^\]]+]|[\(\){}]/g, '').trim()
				break
			}
		}
		return {target, raw, utterance, alignedNL, goal, filepath, line: lineNum} as Training
	}
}

export interface Training {
	target: string,
	raw: string[],
	utterance: string,
	alignedNL: string,
	goal: string,
	filepath: string,
	line: number
}

// /train\s*\(\s*(t-[a-z0-9]+)\s*\)/.exec(line)
// train (t-13whixjb23198s400kcd77igt) {
// 	utterance ("[g:FlightStatusWithDeparture] {[g:DepartureDateTimeExpression] (오늘)[v:viv.time.DateTimeExpression]} {[g:ArrivalAirport] (산호세)[v:viv.geo.LocalityName]}로 가는 비행기 연착되나")
// 	plan (lZBdS8MwFIbf6pzza9uFICIMvBSxv8GOqjfiwAlehzZrD7RJSdKiN/vtJrWdc53CcpPkfZ6cnARj3FRU+YuMktTMDTPaf1ytS/1OJg15wZQpFcddRyUR/61Pd9KXEVOKuApEPFMBqUIqozHZrBFYqWJZI+Ciwxtwte3yFl7/A5dS8NkC97s1H9crEskb5fxJybLA7WaFlR0yw5338FEorjVJgXMnJ1z6c85UlL7yxKWXbTotKYt/oUmLgjgnQdooZqjiIVVUFxy3/FlGLCPz+XOFe0k3bZMXlvPv3zO2RX9LryN42MM+ejhAH4cY4AjHOMEpzjC0FGvcs7y/xgc2caPXzKhtWNurU9gzbje05qiuMvgC)
// 	last-modified (1548663425963)
// }

class TrainingsPerDir extends Map<string, Training[]> {
}

function pathExists(p: string): boolean {
	try {
		fs.accessSync(p);
	} catch (err) {
		return false;
	}

	return true;
}