// Primeiro, vamos definir melhor o textTrigger usando discriminated unions
type BaseTextTrigger = {
    type: 'EQUALS' | 'REGEX' | 'CONTAINS' | 'STARTS_WITH' | 'END_WITH';
    text: string;
};

// Melhorando a definição do clusterTrigger
type ClusterTriggerNew = {
    type: 'NEW';
    id: number;
    inside: boolean;
};

type ClusterTriggerRef = {
    type: 'REF';
    clusterTriggerId: number;
};

type ClusterTrigger = ClusterTriggerNew | ClusterTriggerRef;

type Responses = {
    responseIds: number[];
    type: "REFS"
} | {
    type: "CREATE";
    data: {
        format: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "STICKER" | "DOCUMENT";
        content: string;
    }[]
}

// Type principal refinado
export type ReactiveInput = {
    name: string;
    active: boolean;
    responses: Responses;
    temporalCondition?: {
        initial: Date | string;
        final: Date | string;
    };
    clusterTrigger: ClusterTrigger[];
    textTrigger: BaseTextTrigger[];
};
