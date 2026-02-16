declare module "text-readability" {
  const rs: {
    fleschReadingEase(text: string): number;
    fleschKincaidGrade(text: string): number;
    gunningFog(text: string): number;
    colemanLiauIndex(text: string): number;
    smogIndex(text: string): number;
    automatedReadabilityIndex(text: string): number;
    daleChallReadabilityScore(text: string): number;
    textStandard(text: string, floatOutput?: boolean): string;
    sentenceCount(text: string): number;
    lexiconCount(text: string, removePunctuation?: boolean): number;
    syllableCount(text: string): number;
    polysyllabCount(text: string): number;
    difficultWords(text: string): number;
  };
  export default rs;
}
