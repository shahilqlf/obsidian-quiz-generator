import { App, Component, MarkdownRenderer, Notice } from "obsidian";
import { useEffect, useRef } from "react";
import { FillInTheBlank } from "../../utils/types";
import AnswerInput from "../components/AnswerInput";

// MODIFIED CODE: onAnswerChange signature has changed
interface FillInTheBlankQuestionProps {
	app: App;
	question: FillInTheBlank;
	userAnswer: string[];
	onAnswerChange: (answer: string[], isCorrect: boolean) => void;
}

// MODIFIED CODE: Renamed userAnswer and onAnswerChange for clarity
const FillInTheBlankQuestion = ({ app, question, userAnswer: filledBlanks, onAnswerChange }: FillInTheBlankQuestionProps) => {
	const questionRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const generateQuestion = () => {
			let blankIndex = 0;
			return question.question.replace(/`_+`/g, match => {
				if (blankIndex < filledBlanks.length && filledBlanks[blankIndex] === question.answer[blankIndex]) {
					return filledBlanks[blankIndex++];
				}
				blankIndex++;
				return match;
			});
		};

		if (questionRef.current) {
			questionRef.current.empty();
			const component = new Component();

			generateQuestion().split("\\n").forEach(questionFragment => {
				if (questionRef.current) {
					MarkdownRenderer.render(app, questionFragment, questionRef.current, "", component);
				}
			});
		}
	}, [app, question, filledBlanks]);

	// MODIFIED CODE: This function now calculates correctness and calls onAnswerChange
	const handleSubmit = (input: string) => {
		const normalizedInput = input.toLowerCase().trim();
		const blankIndex = question.answer.findIndex(
			(blank, index) => blank.toLowerCase() === normalizedInput && !filledBlanks[index]
		);

		if (blankIndex !== -1) {
			const newFilledBlanks = [...filledBlanks];
			newFilledBlanks[blankIndex] = question.answer[blankIndex];
			
			// NEW CODE: Check if all blanks are now filled
			const allFilled = newFilledBlanks.every(blank => blank.length > 0);
			
			// Pass the new array and the correctness (only true if all are filled)
			onAnswerChange(newFilledBlanks, allFilled);
			
		} else if (normalizedInput === "skip") {
			// Skipping is not a correct answer
			onAnswerChange(question.answer, false);
		} else {
			new Notice("Incorrect");
		}
	};

	return (
		<div className="question-container-qg">
			<div className="question-qg" ref={questionRef} />
			<div className="input-container-qg">
				<AnswerInput onSubmit={handleSubmit} disabled={filledBlanks.every(blank => blank.length > 0)} />
				<div className="instruction-footnote-qg">
					Press enter to submit your answer to a blank. Enter "skip" to reveal all answers.
				</div>
			</div>
		</div>
	);
};

export default FillInTheBlankQuestion;
