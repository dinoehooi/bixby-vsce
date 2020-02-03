import {TrainingManager, Training} from './training'
import { OutputChannel } from 'vscode';

export class DuplicationChecker {
	public static run(workspaceRoot: string, outputChannel: OutputChannel): void {
		const manager = TrainingManager.getInstance(workspaceRoot)
		manager.readAllTrainings()
		manager.getTargetList().forEach(target => {
			const map: Map<string, Training[]> = new Map
			manager.getTrainingList(target).forEach(training => {
				const key = training.goal.includes(':prompt') ? training.goal + training.utterance : training.utterance
				const array = map.get(key)
				if (array) {
					array.push(training)
				} else {
					map.set(key, [training])
				}
			})

			// append logs to output channel
			map.forEach((trainings, utterance) => {
				if (trainings.length > 1) {
					outputChannel.appendLine(`(${target}) '${utterance}' ${trainings.length} duplications are detected`)
					trainings.forEach(training => {
						outputChannel.appendLine(`\t- ${training.filepath} (line:${training.line})`)
					})
				}
			})
		})
		outputChannel.appendLine('Checking duplications is done')
	}
}