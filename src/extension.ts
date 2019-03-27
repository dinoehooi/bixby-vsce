'use strict'

import * as vscode from 'vscode'
import {TrainingDataProvider} from './treeview/training-data-provider'
import {TrainingCommands} from './training/commands'

export function activate(context: vscode.ExtensionContext) {
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
}
