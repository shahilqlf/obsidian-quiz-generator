import { App, Component, MarkdownRenderer, Notice } from "obsidian";
import { useEffect, useRef } from "react";
import { FillInTheBlank } from "../../utils/types";
import AnswerInput from "../components/AnswerInput";

// MODIFIED CODE: Added userAnswer and onAnswerChange
interface FillInTheBlankQuestionProps {
	app: App;
	question: FillInTheBlank;
	userAnswer: string[];
	onAnswerChange: (answer: string[]) => void;
}

// MODIFIED CODE: Added userAnswer (renamed to filledBlanks) and onAnswerChange
const FillInTheBlankQuestion = ({ app, question, userAnswer: filledBlanks, onAnswerChange: setFilledBlanks }: FillInTheBlankQuestionProps) => {
	// MODIFIED CODE: Removed local state, now using props
	// const [filledBlanks, setFilledBlanks] = useState<string[]>(Array(question.answer.length).fill(""));
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
	}, [app, question, filledBlanks]); // MODIFIED CODE: Dependency updated to prop

	const handleSubmit = (input: string) => {
		const normalizedInput = input.toLowerCase().trim();
		const blankIndex = question.answer.findIndex(
			(blank, index) => blank.toLowerCase() === normalizedInput && !filledBlanks[index]
		);

		if (blankIndex !== -1) {
			// MODIFIED CODE: Call onAnswerChange (as setFilledBlanks) with the new array
			setFilledBlanks((prevFilledBlanks: string[]) => {
				const newFilledBlanks = [...prevFilledBlanks];
				newFilledBlanks[blankIndex] = question.answer[blankIndex];
				return newFilledBlanks;
			});
		} else if (normalizedInput === "skip") {
			// MODIFIED CODE: Call onAnswerChange (as setFilledBlanks) with the full answer
			setFilledBlanks(question.answer);
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
