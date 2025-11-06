import { App, normalizePath, Notice, TFile, TFolder } from "obsidian";
import { QuizSettings } from "../settings/config";
import { Question } from "../utils/types";
import {
	isFillInTheBlank,
	isMatching,
	isMultipleChoice,
	isSelectAllThatApply,
	isShortOrLongAnswer,
	isTrueFalse
} from "../utils/typeGuards";
import { shuffleArray } from "../utils/helpers";
import { SaveFormat } from "../settings/saving/savingConfig";

export default class QuizSaver {
	private readonly app: App;
	private readonly settings: QuizSettings;
	private readonly quizSources: TFile[];
	private readonly saveFilePath: string;
	private readonly validSavePath: boolean;

	constructor(app: App, settings: QuizSettings, quizSources: TFile[]) {
		this.app = app;
		this.settings = settings;
		this.quizSources = quizSources;
		this.saveFilePath = this.getSaveFilePath();
		this.validSavePath = this.app.vault.getAbstractFileByPath(this.settings.savePath) instanceof TFolder;
	}

	// MODIFIED CODE: Added userAnswer parameter
	public async saveQuestion(question: Question, userAnswer: any = null): Promise<void> {
		const saveFile = await this.getSaveFile();

		if (this.settings.saveFormat === SaveFormat.SPACED_REPETITION) {
			// MODIFIED CODE: Pass userAnswer, though we won't use it for spaced repetition for now
			await this.app.vault.append(saveFile, this.createSpacedRepetitionQuestion(question, userAnswer));
		} else {
			// MODIFIED CODE: Pass userAnswer to callout generator
			await this.app.vault.append(saveFile, this.createCalloutQuestion(question, userAnswer));
		}

		if (this.validSavePath) {
			new Notice("Question saved");
		} else {
			new Notice("Invalid save path: Question saved in vault root folder");
		}
	}

	// MODIFIED CODE: Updated to accept the new { question, answer } structure
	public async saveAllQuestions(questionsToSave: { question: Question, answer: any }[]): Promise<void> {
		if (questionsToSave.length === 0) return;

		const quiz: string[] = [];
		for (const item of questionsToSave) {
			if (this.settings.saveFormat === SaveFormat.SPACED_REPETITION) {
				quiz.push(this.createSpacedRepetitionQuestion(item.question, item.answer));
			} else {
				quiz.push(this.createCalloutQuestion(item.question, item.answer));
			}
		}

		const saveFile = await this.getSaveFile();
		await this.app.vault.append(saveFile, quiz.join(""));
		if (this.validSavePath) {
			new Notice("All questions saved");
		} else {
			new Notice("Invalid save path: All questions saved in vault root folder");
		}
	}

	private getFileNames(folder: TFolder): string[] {
		return folder.children
			.filter(file => file instanceof TFile)
			.map(file => file.name.toLowerCase())
			.filter(name => name.startsWith("quiz"));
	}

	private getSaveFilePath(): string {
		let count = 1;
		const saveFolder = this.app.vault.getAbstractFileByPath(this.settings.savePath);
		const validSavePath = saveFolder instanceof TFolder;
		const fileNames = validSavePath ? this.getFileNames(saveFolder) : this.getFileNames(this.app.vault.getRoot());

		while (fileNames.includes(`quiz ${count}.md`)) {
			count++;
		}

		return validSavePath ? normalizePath(`${this.settings.savePath}/Quiz ${count}.md`) : `Quiz ${count}.md`;
	}

	private async getSaveFile(): Promise<TFile> {
		const sourcesProperty = this.settings.quizMaterialProperty
			? `${this.settings.quizMaterialProperty}:\n${this.quizSources.map(source => `  - "${this.app.fileManager.generateMarkdownLink(source, this.saveFilePath)}"`).join("\n")}\n`
			: "";
		const initialContent = this.settings.saveFormat === SaveFormat.SPACED_REPETITION
			? `---\ntags:\n  - flashcards\n${sourcesProperty}---\n`
			: sourcesProperty
				? `---\n${sourcesProperty}---\n`
				: "";
		const saveFile = this.app.vault.getAbstractFileByPath(this.saveFilePath);
		return saveFile instanceof TFile ? saveFile : await this.app.vault.create(this.saveFilePath, initialContent);
	}

	// MODIFIED CODE: Added userAnswer parameter and logic to create failure callouts
	private createCalloutQuestion(question: Question, userAnswer: any = null): string {
		let userAnswerBlock = "";

		if (isTrueFalse(question)) {
			if (userAnswer !== null && userAnswer !== question.answer) {
				userAnswerBlock = `>> [!failure]- Your Answer\n>> ${this.capitalize(userAnswer.toString())}\n`;
			}
			const answer = this.capitalize(question.answer.toString());
			return `> [!question] ${question.question}\n` +
				userAnswerBlock +
				`>> [!success]- Answer\n` +
				`>> ${answer}\n\n`;

		} else if (isMultipleChoice(question)) {
			const options = this.getCalloutOptions(question.options);
			if (userAnswer !== null && userAnswer !== question.answer) {
				userAnswerBlock = `>> [!failure]- Your Answer\n${options[userAnswer].replace(">", ">>")}\n`;
			}
			return `> [!question] ${question.question}\n` +
				`${options.join("\n")}\n` +
				userAnswerBlock +
				`>> [!success]- Answer\n` +
				`${options[question.answer].replace(">", ">>")}\n\n`;

		} else if (isSelectAllThatApply(question)) {
			const options = this.getCalloutOptions(question.options);
			const correctAnswers = options.filter((_, index) => question.answer.includes(index));
			
			// NEW CODE: Check if user answer is different from correct answer
			const userAnswerSorted = userAnswer ? [...userAnswer].sort().join(",") : null;
			const correctAnswerSorted = [...question.answer].sort().join(",");
			
			if (userAnswerSorted !== null && userAnswerSorted !== correctAnswerSorted) {
				const userAnswers = options.filter((_, index) => userAnswer.includes(index));
				userAnswerBlock = `>> [!failure]- Your Answer\n${userAnswers.map(answer => answer.replace(">", ">>")).join("\n")}\n`;
			}
			
			return `> [!question] ${question.question}\n` +
				`${options.join("\n")}\n` +
				userAnswerBlock +
				`>> [!success]- Answer\n` +
				`${correctAnswers.map(answer => answer.replace(">", ">>")).join("\n")}\n\n`;

		} else if (isFillInTheBlank(question)) {
			// NEW CODE: Check if user answer is different from correct answer
			const userAnswerStr = userAnswer ? userAnswer.filter((item: string) => item.length > 0).join(", ") : null;
			const correctAnswerStr = question.answer.join(", ");
			
			if (userAnswerStr !== null && userAnswerStr !== "" && userAnswerStr !== correctAnswerStr) {
				userAnswerBlock = `>> [!failure]- Your Answer\n>> ${userAnswerStr}\n`;
			}
			
			return `> [!question] ${question.question}\n` +
				userAnswerBlock +
				`>> [!success]- Answer\n` +
				`>> ${correctAnswerStr}\n\n`;

		} else if (isMatching(question)) {
			const leftOptions = shuffleArray(question.answer.map(pair => pair.leftOption));
			const rightOptions = shuffleArray(question.answer.map(pair => pair.rightOption));
			const correctAnswers = this.getCalloutMatchingAnswers(leftOptions, rightOptions, question.answer);
			
			// NEW CODE: Check if user answer is different from correct answer
			if (userAnswer !== null && userAnswer.length > 0) {
				const userMatchingAnswers = this.getCalloutMatchingAnswers(leftOptions, rightOptions, userAnswer, true);
				if (userMatchingAnswers.join("\n") !== correctAnswers.join("\n")) {
					userAnswerBlock = `>> [!failure]- Your Answer\n${userMatchingAnswers.join("\n")}\n`;
				}
			}

			return `> [!question] ${question.question}\n` +
				`>> [!example] Group A\n` +
				`${this.getCalloutOptions(leftOptions).map(option => option.replace(">", ">>")).join("\n")}\n` +
				`>\n` +
				`>> [!example] Group B\n` +
				`${this.getCalloutOptions(rightOptions, 13).map(option => option.replace(">", ">>")).join("\n")}\n` +
				`>\n` +
				userAnswerBlock +
				`>> [!success]- Answer\n` +
				`${correctAnswers.join("\n")}\n\n`;

		} else if (isShortOrLongAnswer(question)) {
			if (userAnswer !== null && userAnswer !== "" && userAnswer.toLowerCase().trim() !== "skip" && userAnswer !== question.answer) {
				userAnswerBlock = `>> [!failure]- Your Answer\n>> ${userAnswer}\n`;
			}
			return `> [!question] ${question.question}\n` +
				userAnswerBlock +
				`>> [!success]- Answer\n` +
				`>> ${question.answer}\n\n`;
				
		} else {
			return "> [!failure] Error saving question\n\n";
		}
	}

	// MODIFIED CODE: Added userAnswer parameter
	private createSpacedRepetitionQuestion(question: Question, userAnswer: any = null): string {
		// Spaced repetition format doesn't support failure callouts, so we'll just save the correct answer
		// We add 'userAnswer' just to make the function signature consistent
		
		if (isTrueFalse(question)) {
			const answer = this.capitalize(question.answer.toString());
			return `**True or False:** ${question.question} ${this.settings.inlineSeparator} ${answer}\n\n`;
		} else if (isMultipleChoice(question)) {
			const options = this.getSpacedRepetitionOptions(question.options);
			return `**Multiple Choice:** ${question.question}\n` +
				`${options.join("\n")}\n` +
				`${this.settings.multilineSeparator}\n` +
				`${options[question.answer]}\n\n`;
		} else if (isSelectAllThatApply(question)) {
			const options = this.getSpacedRepetitionOptions(question.options);
			const answers = options.filter((_, index) => question.answer.includes(index));
			return `**Select All That Apply:** ${question.question}\n` +
				`${options.join("\n")}\n` +
				`${this.settings.multilineSeparator}\n` +
				`${answers.join("\n")}\n\n`;
		} else if (isFillInTheBlank(question)) {
			return `**Fill in the Blank:** ${question.question} ${this.settings.inlineSeparator} ${question.answer.join(", ")}\n\n`;
		} else if (isMatching(question)) {
			const leftOptions = shuffleArray(question.answer.map(pair => pair.leftOption));
			const rightOptions = shuffleArray(question.answer.map(pair => pair.rightOption));
			const answers = this.getSpacedRepetitionMatchingAnswers(leftOptions, rightOptions, question.answer);
			return `**Matching:** ${question.question}\n` +
				`Group A\n` +
				`${this.getSpacedRepetitionOptions(leftOptions).join("\n")}\n` +
				`Group B\n` +
				`${this.getSpacedRepetitionOptions(rightOptions, 13).join("\n")}\n` +
				`${this.settings.multilineSeparator}\n` +
				`${answers.join("\n")}\n\n`;
		} else if (isShortOrLongAnswer(question)) {
			if (question.answer.length < 250) {
				return `**Short Answer:** ${question.question} ${this.settings.inlineSeparator} ${question.answer}\n\n`;
			}
			return `**Long Answer:** ${question.question} ${this.settings.inlineSeparator} ${question.answer}\n\n`;
		} else {
			return "Error saving question\n\n";
		}
	}

	private getCalloutOptions(options: string[], startIndex: number = 0): string[] {
		const letters = "abcdefghijklmnopqrstuvwxyz".slice(startIndex);
		return options.map((option, index) => `> ${letters[index]}) ${option}`);
	}

	private getSpacedRepetitionOptions(options: string[], startIndex: number = 0): string[] {
		const letters = "abcdefghijklmnopqrstuvwxyz".slice(startIndex);
		return options.map((option, index) => `${letters[index]}) ${option}`);
	}

	// MODIFIED CODE: Added `isUserAnswer` flag
	private getCalloutMatchingAnswers(
		leftOptions: string[],
		rightOptions: string[],
		answer: { leftOption: string, rightOption: string }[] | { leftIndex: number, rightIndex: number }[],
		isUserAnswer: boolean = false
	): string[] {
		
		const getAnswerPairs = () => {
			if (isUserAnswer) {
				// User answer is { leftIndex, rightIndex }
				return (answer as { leftIndex: number, rightIndex: number }[]).map(pair => ({
					leftLetter: String.fromCharCode(97 + pair.leftIndex),
					rightLetter: String.fromCharCode(110 + pair.rightIndex)
				}));
			} else {
				// Correct answer is { leftOption, rightOption }
				return (answer as { leftOption: string, rightOption: string }[]).map(pair => ({
					leftLetter: String.fromCharCode(97 + leftOptions.indexOf(pair.leftOption)),
					rightLetter: String.fromCharCode(110 + rightOptions.indexOf(pair.rightOption))
				}));
			}
		};

		const pairs = getAnswerPairs();
		pairs.sort((a, b) => a.leftLetter.localeCompare(b.leftLetter)); // Sort alphabetically by left letter
		return pairs.map(pair => `>> ${pair.leftLetter}) -> ${pair.rightLetter})`);
	}

	private getSpacedRepetitionMatchingAnswers(leftOptions: string[], rightOptions: string[], answer: { leftOption: string, rightOption: string }[]): string[] {
		const leftOptionIndexMap = new Map<string, number>(leftOptions.map((option, index) => [option, index]));
		const sortedAnswer = [...answer].sort((a, b) => leftOptionIndexMap.get(a.leftOption)! - leftOptionIndexMap.get(b.leftOption)!);

		return sortedAnswer.map(pair => {
			const leftLetter = String.fromCharCode(97 + leftOptions.indexOf(pair.leftOption));
			const rightLetter = String.fromCharCode(110 + rightOptions.indexOf(pair.rightOption));
			return `${leftLetter}) -> ${rightLetter})`;
		});
	}
	
	// NEW CODE: Helper function
	private capitalize(s: string) {
		return s.charAt(0).toUpperCase() + s.slice(1);
	}
}
