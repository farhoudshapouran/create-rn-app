import validateProjectName from "validate-npm-package-name";

//const NAME_REGEX = /^[$A-Z_][0-9A-Z_$]*$/i;

// ref: https://docs.oracle.com/javase/tutorial/java/nutsandbolts/_keywords.html
const javaKeywords = [
  "abstract",
  "continue",
  "for",
  "new",
  "switch",
  "assert",
  "default",
  "goto",
  "package",
  "synchronized",
  "boolean",
  "do",
  "if",
  "private",
  "this",
  "break",
  "double",
  "implements",
  "protected",
  "throw",
  "byte",
  "else",
  "import",
  "public",
  "throws",
  "case",
  "enum",
  "instanceof",
  "return",
  "transient",
  "catch",
  "extends",
  "int",
  "short",
  "try",
  "char",
  "final",
  "interface",
  "static",
  "void",
  "class",
  "finally",
  "long",
  "strictfp",
  "volatile",
  "const",
  "float",
  "native",
  "super",
  "while",
];

const reservedNames = ["react", "react-native", ...javaKeywords];

export function validateNpmName(name: string): {
  valid: boolean;
  problems?: string[];
} {
  // if (!name.match(NAME_REGEX)) {
  //   return {
  //     valid: false,
  //     problems: ["Please use a valid identifier name (alphanumeric)."],
  //   };
  // }

  // if (name.match(/helloworld/gi)) {
  //   return {
  //     valid: false,
  //     problems: [
  //       "Project name shouldn't contain \"HelloWorld\" name in it, because it is CLI's default placeholder name.",
  //     ],
  //   };
  // }

  const lowerCaseName = name.toLowerCase();
  if (reservedNames.includes(lowerCaseName)) {
    return {
      valid: false,
      problems: ["Please do not use a reserved word."],
    };
  }

  const nameValidation = validateProjectName(name);
  if (nameValidation.validForNewPackages) {
    return { valid: true };
  }

  return {
    valid: false,
    problems: [
      ...(nameValidation.errors || []),
      ...(nameValidation.warnings || []),
    ],
  };
}
