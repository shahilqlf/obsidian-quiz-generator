import { App, Component, MarkdownRenderer } from "obsidian";
import { useEffect, useRef, useState } from "react";
import { SelectAllThatApply } from "../../utils/types";

// MODIFIED CODE: onAnswerChange signature has changed
interface SelectAllThatApplyQuestionProps {
	app: App;
	question: SelectAllThatApply;
	userAnswer: number[]; // This is the "locked-in" answer from the parent
	onAnswerChange: (answer: number[], isCorrect: boolean) => void;
}

const SelectAllThatApplyQuestion = ({ app, question, userAnswer, onAnswerChange }: SelectAllThatApplyQuestionProps) => {
	// NEW CODE: Local state to track selections before submitting
	const [currentSelection, setCurrentSelection] = useState<number[]>(userAnswer);
	
	// This state is local: has the user clicked "Submit" on *this* question?
	const [submitted, setSubmitted] = useState<boolean>(userAnswer.length > 0);
	
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

	// MODIFIED CODE: This now updates the *local* selection state
	const toggleSelection = (buttonAnswer: number) => {
		setCurrentSelection(prevUserAnswer => {
			if (prevUserAnswer.includes(buttonAnswer)) {
				return prevUserAnswer.filter(answer => answer !== buttonAnswer);
			} else {
				return [...prevUserAnswer, buttonAnswer];
			}
		});
	};

	// NEW CODE: Helper function to check correctness
	const checkCorrectness = (selection: number[]) => {
		if (selection.length !== question.answer.length) {
			return false;
		}
		const sortedSelection = [...selection].sort();
		const sortedAnswer = [...question.answer].sort();
		return sortedSelection.every((val, index) => val === sortedAnswer[index]);
	};

	// MODIFIED CODE: This function now calculates correctness and calls onAnswerChange
	const handleSubmit = () => {
		setSubmitted(true);
		const isCorrect = checkCorrectness(currentSelection);
		onAnswerChange(currentSelection, isCorrect);
	};

	const getButtonClass = (buttonAnswer: number) => {
		// Use `currentSelection` for styling if not submitted,
		// but use `userAnswer` (from props) if it is.
		const selection = submitted ? userAnswer : currentSelection;
	
		if (submitted) {
			const correct = question.answer.includes(buttonAnswer);
			const selected = selection.includes(buttonAnswer);
			if (correct && selected) return "select-all-that-apply-button-qg correct-choice-qg";
			if (correct) return "select-all-that-apply-button-qg correct-choice-qg not-selected-qg";
			if (selected) return "select-all-that-apply-button-qg incorrect-choice-qg";
		} else if (selection.includes(buttonAnswer)) {
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
				// MODIFIED CODE: Use the new handleSubmit function
				onClick={handleSubmit}
				disabled={!currentSelection.length || submitted}
			>
				Submit
			</button>
		</div>
	);
};

export default SelectAllThatApplyQuestion;
