import { App } from "obsidian";
import { useState } from "react";
import { QuizSettings } from "../../settings/config";
import { Question } from "../../utils/types";
import {
	isFillInTheBlank,
	isMatching,
	isMultipleChoice,
	isSelectAllThatApply,
	isShortOrLongAnswer,
	isTrueFalse
} from "../../utils/typeGuards";
import ModalButton from "../components/ModalButton";
import TrueFalseQuestion from "./TrueFalseQuestion";
import MultipleChoiceQuestion from "./MultipleChoiceQuestion";
import SelectAllThatApplyQuestion from "./SelectAllThatApplyQuestion";
import FillInTheBlankQuestion from "./FillInTheBlankQuestion";
import MatchingQuestion from "./MatchingQuestion";
import ShortOrLongAnswerQuestion from "./ShortOrLongAnswerQuestion";
import QuizSaver from "../../services/quizSaver";

interface QuizModalProps {
	app: App;
	settings: QuizSettings;
	quiz: Question[];
	quizSaver: QuizSaver;
	reviewing: boolean;
	handleClose: () => void;
}

const QuizModal = ({ app, settings, quiz, quizSaver, reviewing, handleClose }: QuizModalProps) => {
	const [questionIndex, setQuestionIndex] = useState<number>(0);
	const [savedQuestions, setSavedQuestions] = useState<boolean[]>(Array(quiz.length).fill(reviewing));

	// Helper function to initialize user answers
	const initializeUserAnswers = () => {
		return quiz.map(q => {
			if (isSelectAllThatApply(q)) return [];
			if (isFillInTheBlank(q)) return Array(q.answer.length).fill("");
			if (isMatching(q)) return [];
			return null;
		});
	};
	const [userAnswers, setUserAnswers] = useState<any[]>(initializeUserAnswers());

	// --- NEW CODE FOR SCORING ---
	const [score, setScore] = useState<number>(0);
	const [correctness, setCorrectness] = useState<(boolean | null)[]>(Array(quiz.length).fill(null));
	const [quizCompleted, setQuizCompleted] = useState<boolean>(false);
	// --- END NEW CODE ---

	const handlePreviousQuestion = () => {
		if (questionIndex > 0) {
			setQuestionIndex(questionIndex - 1);
		}
	};

	const handleSaveQuestion = async () => {
		const updatedSavedQuestions = [...savedQuestions];
		updatedSavedQuestions[questionIndex] = true;
		setSavedQuestions(updatedSavedQuestions);
		await quizSaver.saveQuestion(quiz[questionIndex], userAnswers[questionIndex]);
	};

	const handleSaveAllQuestions = async () => {
		const questionsToSave = quiz
			.map((question, index) => ({
				question: question,
				answer: userAnswers[index]
			}))
			.filter((_, index) => !savedQuestions[index]);

		const updatedSavedQuestions = savedQuestions.map(() => true);
		setSavedQuestions(updatedSavedQuestions);
		await quizSaver.saveAllQuestions(questionsToSave);
	};

	// MODIFIED CODE: This handler now also accepts `isCorrect`
	const handleAnswerChange = (index: number, answer: any, isCorrect: boolean) => {
		// Only update score the first time an answer is given
		if (correctness[index] === null) {
			const newCorrectness = [...correctness];
			newCorrectness[index] = isCorrect;
			setCorrectness(newCorrectness);
			
			if (isCorrect) {
				setScore(prevScore => prevScore + 1);
			}
		}
		
		const newUserAnswers = [...userAnswers];
		newUserAnswers[index] = answer;
		setUserAnswers(newUserAnswers);
	};
	
	// MODIFIED CODE: Now checks if it's the last question
	const handleNextQuestion = () => {
		if (questionIndex < quiz.length - 1) {
			setQuestionIndex(questionIndex + 1);
		} else {
			// NEW CODE: If it's the last question, show results
			setQuizCompleted(true);
		}
	};

	// MODIFIED CODE: Now passes `onAnswerChange` with the new (isCorrect) parameter
	const renderQuestion = () => {
		const question = quiz[questionIndex];
		if (isTrueFalse(question)) {
			return <TrueFalseQuestion
				key={questionIndex}
				app={app}
				question={question}
				userAnswer={userAnswers[questionIndex]}
				onAnswerChange={(answer, isCorrect) => handleAnswerChange(questionIndex, answer, isCorrect)}
			/>;
		} else if (isMultipleChoice(question)) {
			return <MultipleChoiceQuestion
				key={questionIndex}
				app={app}
				question={question}
				userAnswer={userAnswers[questionIndex]}
				onAnswerChange={(answer, isCorrect) => handleAnswerChange(questionIndex, answer, isCorrect)}
			/>;
		} else if (isSelectAllThatApply(question)) {
			return <SelectAllThatApplyQuestion
				key={questionIndex}
				app={app}
				question={question}
				userAnswer={userAnswers[questionIndex] || []}
				onAnswerChange={(answer, isCorrect) => handleAnswerChange(questionIndex, answer, isCorrect)}
			/>;
		} else if (isFillInTheBlank(question)) {
			return <FillInTheBlankQuestion
				key={questionIndex}
				app={app}
				question={question}
				userAnswer={userAnswers[questionIndex] || Array(question.answer.length).fill("")}
				onAnswerChange={(answer, isCorrect) => handleAnswerChange(questionIndex, answer, isCorrect)}
			/>;
		} else if (isMatching(question)) {
			return <MatchingQuestion
				key={questionIndex}
				app={app}
				question={question}
				userAnswer={userAnswers[questionIndex] || []}
				onAnswerChange={(answer, isCorrect) => handleAnswerChange(questionIndex, answer, isCorrect)}
			/>;
		} else if (isShortOrLongAnswer(question)) {
			return <ShortOrLongAnswerQuestion
				key={questionIndex}
				app={app}
				question={question}
				settings={settings}
				userAnswer={userAnswers[questionIndex] || ""}
				onAnswerChange={(answer, isCorrect) => handleAnswerChange(questionIndex, answer, isCorrect)}
			/>;
		}
	};
	
	// --- NEW CODE FOR SCORING ---
	// This renders the results screen
	const renderResults = () => {
		return (
			<div className="question-container-qg">
				<div className="question-qg" style={{ fontSize: "var(--font-heading-2)" }}>Quiz Completed!</div>
				<div className="question-qg" style={{ fontSize: "var(--font-heading-3)", margin: "20px 0" }}>
					Your Score: {score} / {quiz.length}
				</div>
				<div className="modal-button-container-qg">
					<button className="modal-button-qg" onClick={handleClose}>Finish</button>
				</div>
			</div>
		);
	};
	// --- END NEW CODE ---

	return (
		<div className="modal-container mod-dim">
			<div className="modal-bg" style={{opacity: 0.85}} onClick={handleClose} />
			<div className="modal modal-qg">
				<div className="modal-close-button" onClick={handleClose} />
				<div className="modal-header">
					{/* MODIFIED CODE: Title changes when quiz is complete */}
					<div className="modal-title modal-title-qg">
						{quizCompleted ? "Quiz Results" : `Question ${questionIndex + 1} of ${quiz.length}`}
					</div>
				</div>
				<div className="modal-content modal-content-flex-qg">
					{/* MODIFIED CODE: Hide buttons on results screen */}
					{!quizCompleted && (
						<>
							<div className="modal-button-container-qg">
								<ModalButton
									icon="arrow-left"
									tooltip="Back"
									onClick={handlePreviousQuestion}
									disabled={questionIndex === 0}
								/>
								<ModalButton
									icon="save"
									tooltip="Save"
									onClick={handleSaveQuestion}
									disabled={savedQuestions[questionIndex]}
								/>
								<ModalButton
									icon="save-all"
									tooltip="Save all"
									onClick={handleSaveAllQuestions}
									disabled={!savedQuestions.includes(false)}
								/>
								<ModalButton
									icon="arrow-right"
									tooltip="Next"
									onClick={handleNextQuestion}
									// MODIFIED CODE: Button text changes on last question
									disabled={correctness[questionIndex] === null && !reviewing}
								>
									{questionIndex === quiz.length - 1 ? "Finish" : "Next"}
								</ModalButton>
							</div>
							<hr className="quiz-divider-qg" />
						</>
					)}
					{/* MODIFIED CODE: Show results or question */}
					{quizCompleted ? renderResults() : renderQuestion()}
				</div>
			</div>
		</div>
	);
};

export default QuizModal;
