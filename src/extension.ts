'use strict'

import * as vscode from 'vscode'
import {TrainingDataProvider} from './treeview/training-data/provider'

export function activate(context: vscode.ExtensionContext) {
	const trainingDataProvider = new TrainingDataProvider(vscode.workspace.rootPath)
	vscode.window.registerTreeDataProvider('bixbyTrainings', trainingDataProvider)
	vscode.commands.registerCommand('bixby.commands.training.refresh', () => trainingDataProvider.refresh())
}