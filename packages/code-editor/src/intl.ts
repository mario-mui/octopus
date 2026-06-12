/**
 * 针对某个语言翻译成面向用户的标签。
 * 比如: yaml -> YAML, jenkinsfile -> JENKINSFILE。
 */
export const getLanguageLabel = (lang: string) => ('' + lang).toUpperCase();
