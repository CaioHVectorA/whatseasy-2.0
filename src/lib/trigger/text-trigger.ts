export function textTriggerTest(
    type: "EQUALS" | "CONTAINS" | "STARTS_WITH" | "ENDS_WITH" | "REGEX",
    value: string,
    textString: string
): boolean {
    switch (type) {
        case "EQUALS":
            return textString === value;
        case "CONTAINS":
            return textString.includes(value);
        case "STARTS_WITH":
            return textString.startsWith(value);
        case "ENDS_WITH":
            return textString.endsWith(value);
        case "REGEX":
            return new RegExp(value).test(textString);
    }
}