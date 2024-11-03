export function textTriggerTest(
    type: "EQUALS" | "CONTAINS" | "STARTS_WITH" | "ENDS_WITH" | "REGEX",
    value: string,
    textString: string
): boolean {
    switch (type) {
        case "EQUALS":
            return textString.toUpperCase() === value.toUpperCase();
        case "CONTAINS":
            return textString.toUpperCase().includes(value.toUpperCase());
        case "STARTS_WITH":
            return textString.toUpperCase().startsWith(value.toUpperCase());
        case "ENDS_WITH":
            return textString.toUpperCase().endsWith(value.toUpperCase());
        case "REGEX":
            return new RegExp(value.toUpperCase()).test(textString.toUpperCase());
    }
}