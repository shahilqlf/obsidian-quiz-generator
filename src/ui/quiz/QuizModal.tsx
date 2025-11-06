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

	// NEW CODE: Helper function to initialize the userAnswers state correctly
	const initializeUserAnswers = () => {
		return quiz.map(q => {
			if (isSelectAllThatApply(q)) {
				return []; // Default for select all that apply
			} else if (isFillInTheBlank(q)) {
				return Array(q.answer.length).fill(""); // Default for fill in the blank
			} else if (isMatching(q)) {
				return []; // Default for matching
			} else {
				return null; // Default for True/False, Multiple Choice, and Short/Long
			}
		});
	};

	// NEW CODE: State to store the user's answer for ALL questions
	const [userAnswers, setUserAnswers] = useState<any[]>(initializeUserAnswers());

	const handlePreviousQuestion = () => {
		if (questionIndex > 0) {
			setQuestionIndex(questionIndex - 1);
		}
	};

	// MODIFIED CODE: Pass the user's answer for this question to the saver
	const handleSaveQuestion = async () => {
		const updatedSavedQuestions = [...savedQuestions];
		updatedSavedQuestions[questionIndex] = true;
		setSavedQuestions(updatedSavedQuestions);
		await quizSaver.saveQuestion(quiz[questionIndex], userAnswers[questionIndex]); // Pass current answer
	};

	// MODIFIED CODE: Pass all user answers to the saver
	const handleSaveAllQuestions = async () => {
		// Create a new array that includes the user's answers
		const questionsToSave = quiz
			.map((question, index) => ({
				question: question,
				answer: userAnswers[index] // Get the user's answer
			}))
			.filter((_, index) => !savedQuestions[index]); // Only get unsaved ones

		const updatedSavedQuestions = savedQuestions.map(() => true);
		setSavedQuestions(updatedSavedQuestions);
		await quizSaver.saveAllQuestions(questionsToSave); // Pass this new array
	};

	const handleNextQuestion = () => {
		if (questionIndex < quiz.length - 1) {
			setQuestionIndex(questionIndex + 1);
		}
	};

	// NEW CODE: Handler function to update the userAnswers state
	const handleAnswerChange = (index: number, answer: any) => {
		const newUserAnswers = [...userAnswers];
		newUserAnswers[index] = answer;
		setUserAnswers(newUserAnswers);
	};

	// MODIFIED CODE: The renderQuestion function now passes down the
	// `userAnswer` and `onAnswerChange` props to every question component.
	const renderQuestion = () => {
		const question = quiz[questionIndex];
		if (isTrueFalse(question)) {
			return <TrueFalseQuestion
				key={questionIndex}
				app={app}
				question={question}
				userAnswer={userAnswers[questionIndex]}
				onAnswerChange={(answer) => handleAnswerChange(questionIndex, answer)}
			/>;
		} else if (isMultipleChoice(question)) {
			return <MultipleChoiceQuestion
				key={questionIndex}
				app={app}
				question={question}
				userAnswer={userAnswers[questionIndex]}
				onAnswerChange={(answer) => handleAnswerChange(questionIndex, answer)}
			/>;
		} else if (isSelectAllThatApply(question)) {
			return <SelectAllThatApplyQuestion
				key={questionIndex}
				app={app}
				question={question}
				userAnswer={userAnswers[questionIndex] || []}
				onAnswerChange={(answer) => handleAnswerChange(questionIndex, answer)}
			/>;
		} else if (isFillInTheBlank(question)) {
			return <FillInTheBlankQuestion
				key={questionIndex}
				app={app}
				question={question}
				userAnswer={userAnswers[questionIndex] || Array(question.answer.length).fill("")}
				onAnswerChange={(answer) => handleAnswerChange(questionIndex, answer)}
			/>;
		} else if (isMatching(question)) {
			return <MatchingQuestion
				key={questionIndex}
				app={app}
				question={question}
				userAnswer={userAnswers[questionIndex] || []}
				onAnswerChange={(answer) => handleAnswerChange(questionIndex, answer)}
			/>;
		} else if (isShortOrLongAnswer(question)) {
			return <ShortOrLongAnswerQuestion
				key={questionIndex}
				app={app}
				question={question}
				settings={settings}
				userAnswer={userAnswers[questionIndex] || ""}
				onAnswerChange={(answer) => handleAnswerChange(questionIndex, answer)}
			/>;
		}
	};

	return (
		<div className="modal-container mod-dim">
			<div className="modal-bg" style={{opacity: 0.85}} onClick={handleClose} />
			<div className="modal modal-qg">
				<div className="modal-close-button" onClick={handleClose} />
				<div className="modal-header">
					<div className="modal-title modal-title-qg">Question {questionIndex + 1} of {quiz.length}</div>
				</div>
				<div className="modal-content modal-content-flex-qg">
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
							disabled={questionIndex === quiz.length - 1}
						/>
					</div>
					<hr className="quiz-divider-qg" />
					{renderQuestion()}
				</div>
			</div>
		</div>
	);
};

export default QuizModal;
