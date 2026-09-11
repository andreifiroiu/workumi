export type QuickCaptureType = 'project' | 'work_order' | 'task' | 'note';

export type CaptureConfidence = 'high' | 'medium' | 'low';

export type CapturePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface CaptureParty {
    id: string;
    name: string;
}

export interface CaptureProject {
    id: string;
    name: string;
}

export interface CaptureWorkOrder {
    id: string;
    title: string;
    projectId: string;
}

/** The parents a capture can be filed under, fetched when the panel first opens. */
export interface CaptureOptions {
    parties: CaptureParty[];
    projects: CaptureProject[];
    workOrders: CaptureWorkOrder[];
}

/** What the parser thinks the free text should become. Nothing is written yet. */
export interface CaptureProposal {
    type: QuickCaptureType;
    title: string;
    description: string | null;
    projectId: string | null;
    workOrderId: string | null;
    partyId: string | null;
    dueDate: string | null;
    /** The deadline the model gave when it could not be read as a date. */
    dueDateHint: string | null;
    priority: CapturePriority | null;
    confidence: CaptureConfidence;
    reasoning: string | null;
}

/** Flashed back by the store action so the panel can link to what it made. */
export interface CaptureResult {
    type: QuickCaptureType;
    id: string;
    title: string;
    url: string | null;
}

export interface QuickCaptureFormData {
    type: QuickCaptureType;
    title: string;
    description: string;
    partyId: string;
    projectId: string;
    workOrderId: string;
    dueDate: string;
    priority: string;
    [key: string]: string;
}
