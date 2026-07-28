import type { DailyChallenge } from "@/lib/gamification/challenges";

const SYSTEM_CHALLENGE_IMPORTANCE: Record<string, string> = {
  "1": "Mantener una buena hidratación mejora tu energía, digestión y ayuda a controlar el apetito.",
  "2": "Caminar a diario favorece el corazón, el metabolismo y reduce el estrés acumulado.",
  "4": "Escanear tu despensa te ayuda a cocinar con lo que ya tienes y reducir el desperdicio.",
  "5": "Reducir harinas refinadas estabiliza la glucosa y mejora la saciedad entre comidas.",
  "7": "Evitar bebidas azucaradas reduce calorías vacías y protege tu salud metabólica.",
  "8": "Dormir bien favorece la recuperación, el ánimo y el control del peso.",
  "9": "Cocinar en casa te permite elegir ingredientes más sanos y controlar porciones.",
  "10": "Una pausa activa rompe el sedentarismo y reactiva tu cuerpo en pocos minutos."
};

export function getChallengeImportanceMessage(challenge: DailyChallenge): string {
  if (challenge.source === "custom") {
    return "Este hábito personalizado refuerza tu constancia. Cumplirlo cada día construye una rutina saludable sostenible.";
  }

  return (
    SYSTEM_CHALLENGE_IMPORTANCE[challenge.id] ??
    `Este hábito refuerza tu constancia diaria y alimenta tu racha.`
  );
}
