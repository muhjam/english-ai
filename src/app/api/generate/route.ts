import { NextRequest, NextResponse } from "next/server";
import { Question, QuestionType, SkillType } from "@/store/use-exam-store";

const DIFY_HOST = process.env.NEXT_PUBLIC_DIFY_HOST;
const DIFY_API_KEY = process.env.NEXT_PUBLIC_DIFY_EXAMS_QUESTIONS_GENERATOR_TOKEN;

export async function POST(req: NextRequest) {
    if (!DIFY_HOST || !DIFY_API_KEY) {
        return NextResponse.json({ error: "Dify configuration is missing" }, { status: 500 });
    }

    try {
        const { range, skill, type } = await req.json();

        if (!range || !skill || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const prompt = `Gen ${range}: ${skill}, ${type}.
Sep row by "<_>", parts by "|->".
Format: Desc |-> Op(JSON/[]) |-> Ans |-> Skill |-> Type.
Exact count required.`;

        const response = await fetch(`${DIFY_HOST}/workflows/run`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${DIFY_API_KEY}`,
            },
            body: JSON.stringify({
                inputs: {
                    query: prompt,
                    request: prompt,
                    text: prompt,
                },
                response_mode: "blocking",
                user: "user-" + Math.random().toString(36).substring(7),
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Dify API error:", errorText);
            return NextResponse.json({ error: `Dify API error: ${errorText}` }, { status: response.status });
        }

        const data = await response.json();

        let resultString = data.result || "";
        if (!resultString && data.data?.outputs) {
            resultString = data.data.outputs.result || data.data.outputs.text || "";
        }
        if (!resultString && data.answer) {
            resultString = data.answer;
        }

        const questions = parseDifyCSV(resultString);
        return NextResponse.json({ questions });
    } catch (error: any) {
        console.error("Internal Server Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

function parseDifyCSV(raw: string): Question[] {
    // Basic cleanup of markdown artifacts
    let cleanRaw = raw.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();

    // Split by <_> but also fallback to newlines if <_> is missing
    let rows = cleanRaw.split("<_>").filter((row) => row.trim().length > 0);
    if (rows.length <= 1 && cleanRaw.includes("|->") && cleanRaw.includes("\n")) {
        // Fallback: maybe it used newlines instead of <_>
        rows = cleanRaw.split("\n").filter(row => row.includes("|->"));
    }

    const questions: Question[] = [];

    rows.forEach((row) => {
        const parts = row.split("|->").map((p) => p.trim());

        if (parts.length < 4) return;

        let description = "";
        let optionsStr = "";
        let answer = "";
        let skillStr = "";
        let typeStr = "";

        if (parts.length === 5) {
            [description, optionsStr, answer, skillStr, typeStr] = parts;
        } else if (parts.length === 4) {
            [description, answer, skillStr, typeStr] = parts;
            if (description.includes("[") && description.includes("]")) {
                const match = description.match(/\[.*\]/);
                if (match) {
                    optionsStr = match[0];
                    description = description.replace(optionsStr, "").trim();
                }
            }
        }

        const type = (typeStr || "Multiple Choice") as QuestionType;
        const skill = (skillStr || "Reading") as SkillType;

        let options: string[] | null = null;
        if (type === "Multiple Choice") {
            try {
                const sanitized = optionsStr.replace(/'/g, '"');
                options = JSON.parse(sanitized);
            } catch (e) {
                options = optionsStr
                    .replace(/[\[\]']/g, "")
                    .split(",")
                    .map((o) => o.trim());
            }
        }

        questions.push({
            id: crypto.randomUUID(),
            description,
            options,
            answer,
            skill,
            type,
        });
    });

    return questions;
}
