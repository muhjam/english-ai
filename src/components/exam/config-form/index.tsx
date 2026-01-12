"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { SkillType, QuestionType, useExamStore } from "@/store/use-exam-store";

export const ConfigForm = () => {
    const router = useRouter();
    const createNewExam = useExamStore((state) => state.createNewExam);

    const [questionCount, setQuestionCount] = useState(10);
    const [selectedSkills, setSelectedSkills] = useState<SkillType[]>(["Reading"]);
    const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(["Multiple Choice"]);

    const handleGenerate = () => {
        if (selectedSkills.length === 0 || selectedTypes.length === 0) {
            alert("Please select at least one skill and one question type.");
            return;
        }

        const examId = createNewExam({
            questionCount,
            skills: selectedSkills,
            types: selectedTypes,
        });

        // We'll redirect to playground where generation happens
        router.push(`/playground/${examId}`);
    };

    const toggleSkill = (skill: SkillType) => {
        setSelectedSkills((prev) =>
            prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
        );
    };

    const toggleType = (type: QuestionType) => {
        setSelectedTypes((prev) =>
            prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
        );
    };

    return (
        <div className="flex w-full max-w-md flex-col gap-8 rounded-2xl border border-secondary bg-primary p-6 shadow-sm">
            <div className="flex flex-col gap-2">
                <h2 className="text-display-xs font-semibold text-primary">Setup Your AI English Test</h2>
                <p className="text-md text-tertiary">Configure the exam parameters to generate questions.</p>
            </div>

            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                    <Label>Number of Questions</Label>
                    <Input
                        type="number"
                        value={questionCount.toString()}
                        onChange={(val: string) => {
                            const num = parseInt(val) || 1;
                            setQuestionCount(Math.max(1, Math.min(50, num)));
                        }}
                        placeholder="E.g. 10"
                    />
                </div>

                <div className="flex flex-col gap-3">
                    <Label>Skills to Test</Label>
                    <div className="grid grid-cols-2 gap-4">
                        {(["Reading", "Writing", "Speaking", "Listening"] as SkillType[]).map((skill) => (
                            <Checkbox
                                key={skill}
                                label={skill}
                                isSelected={selectedSkills.includes(skill)}
                                onChange={() => toggleSkill(skill)}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <Label>Question Types</Label>
                    <div className="grid grid-cols-2 gap-4">
                        {(["Multiple Choice", "Essay"] as QuestionType[]).map((type) => (
                            <Checkbox
                                key={type}
                                label={type}
                                isSelected={selectedTypes.includes(type)}
                                onChange={() => toggleType(type)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <Button size="xl" onClick={handleGenerate} className="w-full">
                Generate Test questions
            </Button>
        </div>
    );
};
