import * as vscode from 'vscode'
import * as crypto from 'crypto'
import {TrainingManager} from './training'
import { DuplicationChecker } from './duplication-checker';

export class TrainingCommands {
	static tagValue(editor: vscode.TextEditor): void {
		if (editor.selection.isEmpty) {
			let pos = editor.selection.active
			editor.edit(builder => {
				builder.insert(pos, '()[v:]')
			}).then(()=>{
				setPosition(editor, pos.line, pos.character - 1)
			})
		} else if (editor.selection.isSingleLine) {
			editor.edit(builder=>{
				builder.insert(editor.selection.start, '(')
				builder.insert(editor.selection.end, ')[v:]')
			}).then(()=>{
				let end = editor.selection.end
				setPosition(editor, end.line, end.character - 1)
			})
		} else {
			// TODO: error message 'select characters whthin a line'
		}
	}

	static newTraining(editor: vscode.TextEditor): void {
		const line:vscode.TextLine = editor.document.lineAt(editor.selection.active)
		const tid = crypto.randomBytes(100).toString('base64')
			.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 25)
		const utterance = line.text.trim()
		const pos = editor.selection.active
		editor.edit(builder=>{
			const lineRange = new vscode.Range(pos.with({character:0}), pos.with({character:line.text.length}))
			builder.replace(lineRange,
				`train (t-${tid}) {\n  utterance ("${utterance}")\n}`)
		}).then(()=>{
			setPosition(editor, pos.line + 3, 0)
		})
	}

	static regroupTrainingFilesByGoal(): void {
		const tm: TrainingManager = TrainingManager.getInstance(vscode.workspace.rootPath)
		tm.regroupTrainingFilesByGoal()
	}

	static checkDuplications(outputChannel: vscode.OutputChannel): void {
		outputChannel.clear()
		outputChannel.show()
		DuplicationChecker.run(vscode.workspace.rootPath, outputChannel)
	}
}

function setPosition(editor: vscode.TextEditor, line: number, char: number): void {
	editor.selection = new vscode.Selection(new vscode.Position(line, char), new vscode.Position(line, char))
}