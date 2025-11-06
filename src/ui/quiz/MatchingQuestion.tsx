import { App, Component, MarkdownRenderer } from "obsidian";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Matching } from "../../utils/types";
import { shuffleArray } from "../../utils/helpers";

// Type for a single pair
type MatchingPair = { leftIndex: number, rightIndex: number };

// MODIFIED CODE: onAnswerChange signature has changed
interface MatchingQuestionProps {
	app: App;
	question: Matching;
	userAnswer: MatchingPair[];
	onAnswerChange: (answer: MatchingPair[], isCorrect: boolean) => void;
}

const MatchingQuestion = ({ app, question, userAnswer, onAnswerChange }: MatchingQuestionProps) => {
	const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
	const [selectedRight, setSelectedRight] = useState<number | null>(null);
	
	// NEW CODE: Local state to track selections before submitting
	const [currentSelection, setCurrentSelection] = useState<MatchingPair[]>(userAnswer);
	
	// This state is local: has the user clicked "Submit" on *this* question?
	const [submitted, setSubmitted] = useState<boolean>(userAnswer.length > 0);

	const leftOptions = useMemo<{ value: string, index: number }[]>(() =>
			shuffleArray(question.answer.map((pair, index) => ({ value: pair.leftOption, index }))),
		[question]
	);
	const rightOptions = useMemo<{ value: string, index: number }[]>(() =>
			shuffleArray(question.answer.map((pair, index) => ({ value: pair.rightOption, index }))),
		[question]
	);
	const correctPairsMap = useMemo<Map<number, number>>(() => {
		const leftIndexMap = new Map<string, number>(leftOptions.map((option, index) => [option.value, index]));
		const rightIndexMap = new Map<string, number>(rightOptions.map((option, index) => [option.value, index]));

		return question.answer.reduce((acc, pair) => {
			const leftIndex = leftIndexMap.get(pair.leftOption)!;
			const rightIndex = rightIndexMap.get(pair.rightOption)!;
			acc.set(leftIndex, rightIndex);
			return acc;
		}, new Map<number, number>());
	}, [question, leftOptions, rightOptions]);

	const questionRef = useRef<HTMLDivElement>(null);
	const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

	useEffect(() => {
		const component = new Component();

		question.question.split("\\n").forEach(questionFragment => {
			if (questionRef.current) {
				MarkdownRenderer.render(app, questionFragment, questionRef.current, "", component);
			}
		});

		buttonRefs.current = buttonRefs.current.slice(0, question.answer.length * 2);
		question.answer.forEach((_, index) => {
			const leftButton = buttonRefs.current[index * 2];
			const rightButton = buttonRefs.current[index * 2 + 1];
			if (leftButton) {
				MarkdownRenderer.render(app, leftOptions[index].value, leftButton, "", component);
			}
			if (rightButton) {
				MarkdownRenderer.render(app, rightOptions[index].value, rightButton, "", component);
			}
		});
	}, [app, question, leftOptions, rightOptions]);

	// MODIFIED CODE: All handlers now update *local* state `currentSelection`
	const handleLeftClick = (leftIndex: number) => {
		if (selectedLeft === leftIndex) {
			setSelectedLeft(null);
		} else if (selectedRight !== null) {
			const pairToReplace = currentSelection.find(pair => pair.leftIndex === leftIndex);
			if (pairToReplace) {
				setCurrentSelection(currentSelection.map(pair =>
					pair.rightIndex === pairToReplace.rightIndex ? { leftIndex: leftIndex, rightIndex: selectedRight } : pair
				));
			} else {
				setCurrentSelection([...currentSelection, { leftIndex: leftIndex, rightIndex: selectedRight }]);
			}
			setSelectedLeft(null);
			setSelectedRight(null);
		} else if (!currentSelection.some(pair => pair.leftIndex === leftIndex)) {
			setSelectedLeft(leftIndex);
		}
	};

	const handleRightClick = (rightIndex: number) => {
		if (selectedRight === rightIndex) {
			setSelectedRight(null);
		} else if (selectedLeft !== null) {
			const pairToReplace = currentSelection.find(pair => pair.rightIndex === rightIndex);
			if (pairToReplace) {
				setCurrentSelection(currentSelection.map(pair =>
					pair.leftIndex === pairToReplace.leftIndex ? { leftIndex: selectedLeft, rightIndex: rightIndex } : pair
				));
			} else {
				setCurrentSelection([...currentSelection, { leftIndex: selectedLeft, rightIndex: rightIndex }]);
			}
			setSelectedLeft(null);
			setSelectedRight(null);
		} else if (!currentSelection.some(pair => pair.rightIndex === rightIndex)) {
			setSelectedRight(rightIndex);
		}
	};

	const handleLeftDoubleClick = (leftIndex: number) => {
		setCurrentSelection(currentSelection.filter(pair => pair.leftIndex !== leftIndex));
	};

	const handleRightDoubleClick = (rightIndex: number) => {
		setCurrentSelection(currentSelection.filter(pair => pair.rightIndex !== rightIndex));
	};
	
	// NEW CODE: Helper function to check correctness
	const checkCorrectness = (selection: MatchingPair[]) => {
		if (selection.length !== correctPairsMap.size) {
			return false;
		}
		
		for (const pair of selection) {
			if (correctPairsMap.get(pair.leftIndex) !== pair.rightIndex) {
				return false;
			}
		}
		return true;
	};
	
	// NEW CODE: Handles submit logic
	const handleSubmit = () => {
		setSubmitted(true);
		const isCorrect = checkCorrectness(currentSelection);
		onAnswerChange(currentSelection, isCorrect);
	};

	const getLeftButtonClass = (leftIndex: number): string => {
		const selection = submitted ? userAnswer : currentSelection;
	
		if (submitted) {
			const correctRight = correctPairsMap.get(leftIndex);
			const userPair = selection.find(p => p.leftIndex === leftIndex);
			const correct = userPair ? userPair.rightIndex === correctRight : false;
			return correct ? "matching-button-qg correct-choice-qg" : "matching-button-qg incorrect-choice-qg";
		}
		
		if (selectedLeft === leftIndex || selection.some(pair => pair.leftIndex === leftIndex)) {
			return "matching-button-qg selected-choice-qg";
		}

		return "matching-button-qg";
	};

	const getRightButtonClass = (rightIndex: number): string => {
		const selection = submitted ? userAnswer : currentSelection;
	
		if (submitted) {
			const userPair = selection.find(p => p.rightIndex === rightIndex);
			if (userPair) {
				const correctRight = correctPairsMap.get(userPair.leftIndex);
				return correctRight === rightIndex
					? "matching-button-qg correct-choice-qg"
					: "matching-button-qg incorrect-choice-qg";
			}
			// This right option wasn't selected, but should it have been?
			let correct = false;
			correctPairsMap.forEach((correctRightIndex, leftIndex) => {
				if (correctRightIndex === rightIndex && !selection.some(p => p.leftIndex === leftIndex)) {
					correct = true;
				}
			});
			return correct ? "matching-button-qg correct-choice-qg not-selected-qg" : "matching-button-qg";
		}

		if (selectedRight === rightIndex || selection.some(pair => pair.rightIndex === rightIndex)) {
			return "matching-button-qg selected-choice-qg";
		}

		return "matching-button-qg";
	};

	// Helper to show the pair number in the circle
	const getPairNumber = (index: number, side: "left" | "right") => {
		const selection = submitted ? userAnswer : currentSelection;
		const pairIndex = selection.findIndex(pair => (side === "left" ? pair.leftIndex : pair.rightIndex) === index);
		return pairIndex === -1 ? "" : pairIndex + 1;
	};

	return (
		<div className="question-container-qg">
			<div className="question-qg" ref={questionRef} />
			<div className="matching-container-qg">
				{question.answer.map((_, index) => (
					<Fragment key={index}>
						<div className="matching-button-container-qg">
							<svg className="svg-left-qg" viewBox="0 0 40 40">
								<circle className="svg-circle-qg" cx="20" cy="20" r="18" />
								<text className="svg-circle-text-qg" x="20" y="26">
									{getPairNumber(index, "left")}
								</text>
							</svg>
							<button
								ref={el => buttonRefs.current[index * 2] = el}
								className={getLeftButtonClass(index)}
								onClick={() => handleLeftClick(index)}
								onDoubleClick={() => handleLeftDoubleClick(index)}
								disabled={submitted}
							/>
						</div>
						<div className="matching-button-container-qg">
							<svg className="svg-right-qg" viewBox="0 0 40 40">
								<circle className="svg-circle-qg" cx="20" cy="20" r="18" />
								<text className="svg-circle-text-qg" x="20" y="26">
									{getPairNumber(index, "right")}
								</text>
							</svg>
							<button
								ref={(el) => buttonRefs.current[index * 2 + 1] = el}
								className={getRightButtonClass(index)}
								onClick={() => handleRightClick(index)}
								onDoubleClick={() => handleRightDoubleClick(index)}
								disabled={submitted}
							/>
						</div>
					</Fragment>
				))}
			</div>
			<button
				className="submit-answer-qg"
				// MODIFIED CODE: Use new handleSubmit
				onClick={handleSubmit}
				disabled={
					currentSelection.length !== question.answer.length ||
					submitted
				}
			>
				Submit
			</button>
		</div>
	);
};

export default MatchingQuestion;
