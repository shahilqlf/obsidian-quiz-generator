import { App, Component, MarkdownRenderer } from "obsidian";
import { useEffect, useRef } from "react";
import { TrueFalse } from "../../utils/types";

// MODIFIED CODE: onAnswerChange signature has changed
interface TrueFalseQuestionProps {
	app: App;
	question: TrueFalse;
	userAnswer: boolean | null;
	onAnswerChange: (answer: boolean, isCorrect: boolean) => void; // Now sends `isCorrect`
}

const TrueFalseQuestion = ({ app, question, userAnswer, onAnswerChange }: TrueFalseQuestionProps) => {
	const questionRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const component = new Component();

		question.question.split("\\n").forEach(questionFragment => {
			if (questionRef.current) {
				MarkdownRenderer.render(app, questionFragment, questionRef.current, "", component);
			}
		});
	}, [app, question]);

	const getButtonClass = (buttonAnswer: boolean) => {
		if (userAnswer === null) return "true-false-button-qg";
		const correct = buttonAnswer === question.answer;
		const selected = buttonAnswer === userAnswer;
		if (correct && selected) return "true-false-button-qg correct-choice-qg";
		if (correct) return "true-false-button-qg correct-choice-qg not-selected-qg";
		if (selected) return "true-false-button-qg incorrect-choice-qg";
		return "true-false-button-qg";
	};

	return (
		<div className="question-container-qg">
			<div className="question-qg" ref={questionRef} />
			<div className="true-false-container-qg">
				<button
					className={getButtonClass(true)}
					// MODIFIED CODE: Now checks correctness and passes it to the parent
					onClick={() => {
						if (userAnswer === null) {
							const isCorrect = true === question.answer;
							onAnswerChange(true, isCorrect);
						}
					}}
					disabled={userAnswer !== null}
				>
					True
				</button>
				<button
					className={getButtonClass(false)}
					// MODIFIED CODE: Now checks correctness and passes it to the parent
					onClick={() => {
						if (userAnswer === null) {
							const isCorrect = false === question.answer;
							onAnswerChange(false, isCorrect);
						}
					}}
					disabled={userAnswer !== null}
				>
					False
				</button>
			</div>
		</div>
	);
};

export default TrueFalseQuestion;
