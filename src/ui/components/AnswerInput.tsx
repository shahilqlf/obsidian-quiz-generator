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
