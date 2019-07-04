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

	static addBunchOfTrainings(editor: vscode.TextEditor): void {
		const start = editor.selection.start.line
		let end = editor.selection.end.line
		end = start == end || editor.selection.end.character != 0 ? end : end - 1
		const indices = Array.from({length: end - start + 1}, (v, k) => k + start)
		const lines: string[] = indices.map(idx => editor.document.lineAt(idx).text.trim())
		const trainings = lines.map(line => {
			const tid = crypto.randomBytes(100).toString('base64')
				.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 25)
			return `train (t-${tid}) {\n  utterance ("${line}")\n}`
		}).join('\n')

		const endLength = editor.document.lineAt(end).text.length
		editor.edit(builder => {
			const lineRange = new vscode.Range(
				new vscode.Position(start, 0),
				new vscode.Position(end, endLength)
			)
			builder.replace(lineRange, trainings)
		}).then(() => {
			// set position to the next line
			setPosition(editor, end + (end - start + 1) * 2 + 1, 0)
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

	static gatherTaggedValueByType(outputChannel: vscode.OutputChannel): void {
		vscode.window.showInputBox({
			ignoreFocusOut: true,
			placeHolder: 'value type to search'
		}).then((valueType: string) => {
			outputChannel.clear()
			outputChannel.show()
			outputChannel.appendLine(`Gathering values tagged with [v:${valueType}] and then removing duplicate values...`)
			const tm: TrainingManager = TrainingManager.getInstance(vscode.workspace.rootPath)
			tm.readAllTrainings()
			tm.gatherTaggedValueByType(valueType).forEach(value => { outputChannel.appendLine(value) })
			outputChannel.appendLine('--- end of values ---')
		})
	}
}

function setPosition(editor: vscode.TextEditor, line: number, char: number): void {
	editor.selection = new vscode.Selection(new vscode.Position(line, char), new vscode.Position(line, char))
}