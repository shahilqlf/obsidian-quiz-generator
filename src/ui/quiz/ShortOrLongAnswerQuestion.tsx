import { App, Component, MarkdownRenderer, Notice } from "obsidian";
import { useEffect, useMemo, useRef, useState } from "react";
import { ShortOrLongAnswer } from "../../utils/types";
import { QuizSettings } from "../../settings/config";
import GeneratorFactory from "../../generators/generatorFactory";
import AnswerInput from "../components/AnswerInput";

// MODIFIED CODE: onAnswerChange signature has changed
interface ShortOrLongAnswerQuestionProps {
	app: App;
	question: ShortOrLongAnswer;
	settings: QuizSettings;
	userAnswer: string;
	onAnswerChange: (answer: string, isCorrect: boolean) => void;
}

// MODIFIED CODE: Added onAnswerChange
const ShortOrLongAnswerQuestion = ({ app, question, settings, userAnswer, onAnswerChange }: ShortOrLongAnswerQuestionProps) => {
	// MODIFIED CODE: Status is now derived from whether userAnswer (from parent) exists
	const [status, setStatus] = useState<"answering" | "evaluating" | "submitted">(userAnswer ? "submitted" : "answering");
	const component = useMemo<Component>(() => new Component(), []);
	const questionRef = useRef<HTMLDivElement>(null);
	const answerRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		question.question.split("\\n").forEach(questionFragment => {
			if (questionRef.current) {
				MarkdownRenderer.render(app, questionFragment, questionRef.current, "", component);
			}
		});
	}, [app, question, component]);

	useEffect(() => {
		if (answerRef.current && status === "submitted") {
			MarkdownRenderer.render(app, question.answer, answerRef.current, "", component);
		}
	}, [app, question, component, status]);

	// MODIFIED CODE: This function now calculates correctness and calls onAnswerChange
	const handleSubmit = async (input: string) => {
		const trimmedInput = input.trim();
		
		if (trimmedInput.toLowerCase() === "skip") {
			onAnswerChange(trimmedInput, false); // Skipping is not correct
			setStatus("submitted");
			return;
		}

		try {
			setStatus("evaluating");
			new Notice("Evaluating answer...");
			const generator = GeneratorFactory.createInstance(settings);
			const similarity = await generator.shortOrLongAnswerSimilarity(trimmedInput, question.answer);
			const similarityPercentage = Math.round(similarity * 100);
			
			const isCorrect = similarityPercentage >= 80; // Calculate correctness
			
			if (isCorrect) {
				new Notice(`Correct: ${similarityPercentage}% match`);
			} else {
				new Notice(`Incorrect: ${similarityPercentage}% match`);
			}
			
			onAnswerChange(trimmedInput, isCorrect); // Send answer and correctness
			setStatus("submitted");
		} catch (error) {
			setStatus("answering");
			new Notice((error as Error).message, 0);
		}
	};

	return (
		<div className="question-container-qg">
			<div className="question-qg" ref={questionRef} />
			{status === "submitted" && <button className="answer-qg" ref={answerRef} />}
			<div className={status === "submitted" ? "input-container-qg" : "input-container-qg limit-height-qg"}>
				{/* MODIFIED CODE: We pass the parent's userAnswer to pre-fill the input if it exists */}
				<AnswerInput
					onSubmit={handleSubmit}
					clearInputOnSubmit={false}
					disabled={status !== "answering"}
					initialValue={userAnswer}
				/>
				<div className="instruction-footnote-qg">
					Press enter to submit your answer. Enter "skip" to reveal the answer.
				</div>
			</div>
		</div>
	);
};

// We need to modify AnswerInput to accept an initial value
// This is a small change to src/ui/components/AnswerInput.tsx
// I'll provide this change here to ensure it works.

// ---
// --- HEY! We need to make a quick change to one more file: AnswerInput.tsx
// ---
// Open `src/ui/components/AnswerInput.tsx` and replace it with this:
// ---

/*
import { Notice } from "obsidian";
import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

interface AnswerInputProps {
	onSubmit: (input: string) => void;
	clearInputOnSubmit?: boolean;
	disabled?: boolean;
	initialValue?: string; // NEW PROP
}

const AnswerInput = ({ onSubmit, clearInputOnSubmit = true, disabled = false, initialValue = "" }: AnswerInputProps) => {
	const [userInput, setUserInput] = useState<string>(initialValue); // MODIFIED
	const inputRef = useRef<HTMLTextAreaElement>(null);

	const adjustInputHeight = () => {
		if (inputRef.current) {
			inputRef.current.style.height = "auto";
			inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
		}
	};
	
	// NEW CODE: Adjust height on load
	useEffect(() => {
		adjustInputHeight();
	}, []);

	const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
		setUserInput(event.target.value);
		adjustInputHeight();
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key !== "Enter" || event.shiftKey) return;

		event.preventDefault();
		if (!userInput.trim()) {
			new Notice("Input cannot be blank");
			return;
		}

		onSubmit(userInput);
		if (clearInputOnSubmit || userInput.toLowerCase().trim() === "skip") {
			setUserInput("");
		}
		adjustInputHeight();
	};

	return (
		<textarea
			className="text-area-input-qg"
			value={userInput}
			ref={inputRef}
			onChange={handleInputChange}
			onKeyDown={handleKeyDown}
			disabled={disabled}
			placeholder="Type your answer here..."
			rows={1}
		/>
	);
};

export default AnswerInput;
*/
