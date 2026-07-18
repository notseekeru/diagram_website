export type DiagramSummary = {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
};

export type StatusTone = "info" | "success" | "error";

export type StatusMessage = {
    tone: StatusTone;
    message: string;
};
