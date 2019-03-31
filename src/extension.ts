'use strict'

import * as vscode from 'vscode'
import {TrainingDataProvider} from './treeview/training-data-provider'
import {TrainingCommands} from './training/commands'

let outputChannel: vscode.OutputChannel | undefined

export function activate(context: vscode.ExtensionContext) {
	outputChannel = vscode.window.createOutputChannel('Bixby')
	const trainingDataProvider = new TrainingDataProvider(vscode.workspace.rootPath)
	vscode.window.registerTreeDataProvider('bixbyTrainings', trainingDataProvider)
	vscode.commands.registerCommand('bixby.commands.training.refresh',
		() => trainingDataProvider.refresh())
	vscode.commands.registerCommand('bixby.commands.training.tag-value',
		() => TrainingCommands.tagValue(vscode.window.activeTextEditor))
	vscode.commands.registerCommand('bixby.commands.training.new-training',
		() => TrainingCommands.newTraining(vscode.window.activeTextEditor))
	vscode.commands.registerCommand('bixby.commands.training.regroup-file',
		() => TrainingCommands.regroupTrainingFilesByGoal() )
	vscode.commands.registerCommand('bixby.commands.training.check-duplications',
		() => TrainingCommands.checkDuplications(outputChannel))
	vscode.commands.registerCommand('bixby.commands.training.goto',
		(filepath: string, line: number) => {
			vscode.workspace.openTextDocument(filepath).then((doc: vscode.TextDocument)=>{
				line = line - 1
				vscode.window.showTextDocument(doc,
					{selection: new vscode.Selection(line, 0, line, 0)})
			})
		})
}

export function deactivate(): void {
	if (outputChannel) {
		outputChannel.dispose()
	}
}
