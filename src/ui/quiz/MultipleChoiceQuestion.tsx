import { App, Component, MarkdownRenderer } from "obsidian";
import { useEffect, useRef } from "react";
import { MultipleChoice } from "../../utils/types";

// MODIFIED CODE: Added userAnswer and onAnswerChange to the props
interface MultipleChoiceQuestionProps {
	app: App;
	question: MultipleChoice;
	userAnswer: number | null;
	onAnswerChange: (answer: number) => void;
}

// MODIFIED CODE: Added userAnswer and onAnswerChange to the function arguments
const MultipleChoiceQuestion = ({ app, question, userAnswer, onAnswerChange }: MultipleChoiceQuestionProps) => {
	// MODIFIED CODE: Removed the local state, as it's now managed by the parent
	// const [userAnswer, setUserAnswer] = useState<number | null>(null);
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

	const getButtonClass = (buttonAnswer: number) => {
		if (userAnswer === null) return "multiple-choice-button-qg";
		const correct = buttonAnswer === question.answer;
		const selected = buttonAnswer === userAnswer;
		if (correct && selected) return "multiple-choice-button-qg correct-choice-qg";
		if (correct) return "multiple-choice-button-qg correct-choice-qg not-selected-qg";
		if (selected) return "multiple-choice-button-qg incorrect-choice-qg";
		return "multiple-choice-button-qg";
	};

	return (
		<div className="question-container-qg">
			<div className="question-qg" ref={questionRef} />
			<div className="multiple-choice-container-qg">
				{question.options.map((_, index) => (
					<button
						key={index}
						ref={(el) => buttonRefs.current[index] = el}
						className={getButtonClass(index)}
						// MODIFIED CODE: Call the onAnswerChange prop instead of setting local state
						onClick={() => {
							if (userAnswer === null) {
								onAnswerChange(index);
							}
						}}
						disabled={userAnswer !== null}
					/>
				))}
			</div>
		</div>
	);
};

export default MultipleChoiceQuestion;
