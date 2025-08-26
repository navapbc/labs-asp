import type {
    ScorerRunInputForAgent,
    ScorerRunOutputForAgent,
} from "@mastra/core/scores";

export const roundToTwoDecimals = (num: number) => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

export function isCloserTo(
    value: number,
    target1: number,
    target2: number
): boolean {
    return Math.abs(value - target1) < Math.abs(value - target2);
}

export const getUserMessageFromRunInput = (input?: ScorerRunInputForAgent) => {
    return input?.inputMessages.find(({ role }) => role === "user")?.content;
};

export const getAssistantMessageFromRunOutput = (
    output?: ScorerRunOutputForAgent
) => {
    return output?.find(({ role }) => role === "assistant")?.content;
};