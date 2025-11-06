import { App, Component, MarkdownRenderer } from "obsidian";
import { useEffect, useRef, useState } from "react";
import { SelectAllThatApply } from "../../utils/types";

// MODIFIED CODE: Added userAnswer and onAnswerChange
interface SelectAllThatApplyQuestionProps {
	app: App;
	question: SelectAllThatApply;
	userAnswer: number[];
	onAnswerChange: (answer: number[]) => void;
}

// MODIFIED CODE: Added userAnswer and onAnswerChange
const SelectAllThatApplyQuestion = ({ app, question, userAnswer, onAnswerChange }: SelectAllThatApplyQuestionProps) => {
	// MODIFIED CODE: Removed local answer state
	// const [userAnswer, setUserAnswer] = useState<number[]>([]);
	const [submitted, setSubmitted] = useState<boolean>(false);
	const questionRef = useRef<HTMLDivElement>(null);
	const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

	useEffect(() => {
		const component = new Component();

		question.question.split("\\n").forEach(questionFragment => {
			if (questionRef.current) {
				MarkdownRenderer.render(app, questionFragment, questionRef.current, "", component);
			}
		});

		buttonRefs.current = buttonRefs.current.slice(0, question.options.length);
		buttonRefs.current.forEach((button, index) => {
			if (button) {
				MarkdownRenderer.render(app, question.options[index], button, "", component);
			}
		});
	}, [app, question]);

	// MODIFIED CODE: Updated to call onAnswerChange prop
	const toggleSelection = (buttonAnswer: number) => {
		let newUserAnswer: number[];
		if (userAnswer.includes(buttonAnswer)) {
			newUserAnswer = userAnswer.filter(answer => answer !== buttonAnswer);
		} else {
			newUserAnswer = [...userAnswer, buttonAnswer];
		}
		onAnswerChange(newUserAnswer); // Pass the new array up to the parent
	};

	const getButtonClass = (buttonAnswer: number) => {
		if (submitted) {
			const correct = question.answer.includes(buttonAnswer);
			const selected = userAnswer.includes(buttonAnswer);
			if (correct && selected) return "select-all-that-apply-button-qg correct-choice-qg";
			if (correct) return "select-all-that-apply-button-qg correct-choice-qg not-selected-qg";
			if (selected) return "select-all-that-apply-button-qg incorrect-choice-qg";
		} else if (userAnswer.includes(buttonAnswer)) {
			return "select-all-that-apply-button-qg selected-choice-qg";
		}
		return "select-all-that-apply-button-qg";
	};

	return (
		<div className="question-container-qg">
			<div className="question-qg" ref={questionRef} />
			<div className="select-all-that-apply-container-qg">
				{question.options.map((_, index) => (
					<button
						key={index}
						ref={(el) => buttonRefs.current[index] = el}
						className={getButtonClass(index)}
						onClick={() => toggleSelection(index)}
						disabled={submitted}
					/>
				))}
			</div>
			<button
				className="submit-answer-qg"
				onClick={() => setSubmitted(true)}
				disabled={!userAnswer.length || submitted}
			>
				Submit
			</button>
		</div>
	);
};

export default SelectAllThatApplyQuestion;
