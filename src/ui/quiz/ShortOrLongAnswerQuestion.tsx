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
